/**
 * Shared helpers for offerwall / ad-network postback integrations.
 *
 * These utilities are used by the independent platform services in
 * `server/services/*`. They intentionally do NOT modify any existing business
 * logic; they only wrap the existing `creditRewardWithVip` flow and provide
 * common bookkeeping (webhook logs, conversion records, duplicate checks).
 */

import { eq } from "drizzle-orm";
import {
  db,
  offerwallConversionsTable,
  usersTable,
  webhookLogsTable,
} from "../db/index";
import { creditRewardWithVip, logActivity } from "./finance";

export interface PostbackContext {
  provider: string;
  conversionType?: string;
  eventType?: string;
  httpMethod: string;
  rawQuery?: string;
  rawBody?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface CreditResult {
  success: boolean;
  duplicate?: boolean;
  creditedAmount?: number;
  error?: string;
}

export async function findUserById(userId: number) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  return user ?? null;
}

export async function isConversionDuplicate(provider: string, transactionId: string) {
  const [existing] = await db
    .select({ id: offerwallConversionsTable.id })
    .from(offerwallConversionsTable)
    .where(eq(offerwallConversionsTable.transactionId, transactionId))
    .limit(1);
  return !!existing;
}

export async function recordConversion(params: {
  provider: string;
  conversionType?: string;
  userId: number;
  externalUserId: string;
  transactionId: string;
  offerId?: string;
  taskId?: string;
  goalId?: string;
  title?: string;
  status?: string;
  rewardAmount: number;
  revenueUsd: number;
  multiplierApplied?: number;
  sourceEvent?: string;
  ipAddress?: string;
  userAgent?: string;
  rawPayload?: string;
}) {
  const [conversion] = await db
    .insert(offerwallConversionsTable)
    .values({
      provider: params.provider,
      conversionType: params.conversionType ?? "offer",
      userId: params.userId,
      externalUserId: params.externalUserId,
      transactionId: params.transactionId,
      offerId: params.offerId ?? null,
      taskId: params.taskId ?? null,
      goalId: params.goalId ?? null,
      title: params.title ?? null,
      status: params.status ?? "completed",
      rewardAmount: String(params.rewardAmount),
      revenueUsd: String(params.revenueUsd),
      multiplierApplied: String(params.multiplierApplied ?? 1),
      sourceEvent: params.sourceEvent ?? null,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
      rawPayload: params.rawPayload ?? null,
    })
    .returning();
  return conversion;
}

export async function updateConversionStatus(transactionId: string, status: string) {
  await db
    .update(offerwallConversionsTable)
    .set({ status, updatedAt: new Date() })
    .where(eq(offerwallConversionsTable.transactionId, transactionId));
}

export async function logWebhook(params: {
  provider: string;
  eventType: string;
  httpMethod: string;
  status: string;
  signatureValid: boolean;
  userId?: number | null;
  referenceId?: string | null;
  payload: string;
  responseBody?: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  await db.insert(webhookLogsTable).values({
    provider: params.provider,
    eventType: params.eventType,
    httpMethod: params.httpMethod,
    status: params.status,
    signatureValid: params.signatureValid,
    userId: params.userId ?? null,
    referenceId: params.referenceId ?? null,
    payload: params.payload,
    responseBody: params.responseBody ?? null,
    ipAddress: params.ipAddress ?? null,
    userAgent: params.userAgent ?? null,
  });
}

export async function creditOfferwallReward(params: {
  userId: number;
  baseAmount: number;
  rewardType: string;
  description: string;
  source: string;
  referenceId: string;
  sourceMultiplier?: number;
  metadata?: Record<string, unknown>;
}) {
  return creditRewardWithVip({
    userId: params.userId,
    baseAmount: params.baseAmount,
    rewardType: params.rewardType,
    description: params.description,
    source: params.source,
    referenceId: params.referenceId,
    sourceMultiplier: params.sourceMultiplier,
    metadata: params.metadata,
  });
}

export async function logOfferwallActivity(params: {
  action: string;
  userId?: number;
  referenceId?: string | number;
  details?: Record<string, unknown>;
}) {
  await logActivity({
    action: params.action,
    entityType: "offerwall_conversions",
    entityId: params.referenceId == null ? null : String(params.referenceId),
    userId: params.userId ?? null,
    details: params.details ?? {},
  });
}

export interface StandardPostbackPayload {
  userId: string;
  transactionId: string;
  offerId?: string;
  offerName?: string;
  conversionType?: string;
  amount: string;
  payout: string;
  status: string;
  signature: string;
  ip?: string;
  country?: string;
}

export async function processStandardOfferwallPostback(params: {
  provider: string;
  secretKey: string;
  rewardMultiplier: number;
  payload: StandardPostbackPayload | null;
  rawPayload: string;
  httpMethod: string;
  ipAddress?: string;
  userAgent?: string;
  verifySignature: (payload: StandardPostbackPayload, secret: string) => boolean;
  isReversal?: (status: string) => boolean;
  rewardType?: (payload: StandardPostbackPayload) => string;
}): Promise<{ status: number; body: string; webhookStatus: string }> {
  const { provider, payload, rawPayload, httpMethod, ipAddress, userAgent } = params;

  if (!payload) {
    await logWebhook({
      provider,
      eventType: "postback",
      httpMethod,
      status: "invalid_payload",
      signatureValid: false,
      referenceId: null,
      payload: rawPayload,
      responseBody: "Invalid payload",
      ipAddress,
      userAgent,
    });
    return { status: 400, body: "Invalid payload", webhookStatus: "invalid_payload" };
  }

  let signatureValid = false;
  try {
    signatureValid = params.verifySignature(payload, params.secretKey);
  } catch {
    signatureValid = false;
  }

  if (!signatureValid) {
    await logWebhook({
      provider,
      eventType: "postback",
      httpMethod,
      status: "invalid_signature",
      signatureValid: false,
      referenceId: payload.transactionId,
      payload: rawPayload,
      responseBody: "Invalid signature",
      ipAddress,
      userAgent,
    });
    return { status: 403, body: "Invalid signature", webhookStatus: "invalid_signature" };
  }

  const userId = parseInt(payload.userId, 10);
  if (!Number.isFinite(userId)) {
    await logWebhook({
      provider,
      eventType: "postback",
      httpMethod,
      status: "invalid_user",
      signatureValid: true,
      referenceId: payload.transactionId,
      payload: rawPayload,
      responseBody: "Invalid user",
      ipAddress,
      userAgent,
    });
    return { status: 400, body: "Invalid user", webhookStatus: "invalid_user" };
  }

  const user = await findUserById(userId);
  if (!user) {
    await logWebhook({
      provider,
      eventType: "postback",
      httpMethod,
      status: "user_not_found",
      signatureValid: true,
      userId,
      referenceId: payload.transactionId,
      payload: rawPayload,
      responseBody: "User not found",
      ipAddress,
      userAgent,
    });
    return { status: 200, body: "ok", webhookStatus: "user_not_found" };
  }

  const isReversal = params.isReversal ? params.isReversal(payload.status) : payload.status === "2";
  const duplicate = await isConversionDuplicate(provider, payload.transactionId);

  if (isReversal) {
    if (!duplicate) {
      await recordConversion({
        provider,
        conversionType: payload.conversionType ?? "offer",
        userId,
        externalUserId: payload.userId,
        transactionId: payload.transactionId,
        offerId: payload.offerId,
        title: payload.offerName,
        status: "reversed",
        rewardAmount: 0,
        revenueUsd: parseFloat(payload.payout) || 0,
        multiplierApplied: params.rewardMultiplier,
        ipAddress,
        userAgent,
        rawPayload,
      });
    } else {
      await updateConversionStatus(payload.transactionId, "reversed");
    }
    await logWebhook({
      provider,
      eventType: "postback",
      httpMethod,
      status: "reversed",
      signatureValid: true,
      userId,
      referenceId: payload.transactionId,
      payload: rawPayload,
      responseBody: "ok",
      ipAddress,
      userAgent,
    });
    return { status: 200, body: "ok", webhookStatus: "reversed" };
  }

  if (duplicate) {
    await logWebhook({
      provider,
      eventType: "postback",
      httpMethod,
      status: "duplicate",
      signatureValid: true,
      userId,
      referenceId: payload.transactionId,
      payload: rawPayload,
      responseBody: "ok",
      ipAddress,
      userAgent,
    });
    return { status: 200, body: "ok", webhookStatus: "duplicate" };
  }

  const baseAmount = parseFloat(payload.amount) || 0;
  const revenueUsd = parseFloat(payload.payout) || 0;

  const credit = await creditOfferwallReward({
    userId,
    baseAmount,
    rewardType: params.rewardType ? params.rewardType(payload) : "offer_reward",
    description: payload.offerName || `${provider} reward`,
    source: provider,
    referenceId: payload.transactionId,
    sourceMultiplier: params.rewardMultiplier,
    metadata: {
      offerId: payload.offerId,
      conversionType: payload.conversionType,
      revenueUsd,
      country: payload.country,
    },
  });

  await recordConversion({
    provider,
    conversionType: payload.conversionType ?? "offer",
    userId,
    externalUserId: payload.userId,
    transactionId: payload.transactionId,
    offerId: payload.offerId,
    title: payload.offerName,
    status: "completed",
    rewardAmount: credit.totalCredited,
    revenueUsd,
    multiplierApplied: params.rewardMultiplier * credit.vipMultiplier,
    ipAddress,
    userAgent,
    rawPayload,
  });

  await logOfferwallActivity({
    action: `${provider}_conversion_credited`,
    userId,
    referenceId: payload.transactionId,
    details: {
      baseAmount,
      credited: credit.totalCredited,
      rewardMultiplier: params.rewardMultiplier,
      vipMultiplier: credit.vipMultiplier,
    },
  });

  await logWebhook({
    provider,
    eventType: "postback",
    httpMethod,
    status: "credited",
    signatureValid: true,
    userId,
    referenceId: payload.transactionId,
    payload: rawPayload,
    responseBody: "ok",
    ipAddress,
    userAgent,
  });

  return { status: 200, body: "ok", webhookStatus: "credited" };
}
