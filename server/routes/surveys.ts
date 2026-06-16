import { Router } from "express";
import { desc, eq, sql } from "drizzle-orm";
import { db, offerwallConversionsTable, usersTable, webhookLogsTable } from "../db/index";
import { requireAuth } from "../middleware/auth";
import { buildBitLabsOfferwallUrl, getRequestIp, isBitLabsRewardable, parseBitLabsCallbackPayload, verifyBitLabsSignature } from "../lib/offerwalls";
import { creditRewardWithVip, getAdminSettings, logActivity } from "../lib/finance";

const router = Router();

async function logWebhookEvent(params: {
  eventType?: string;
  httpMethod: string;
  status: string;
  signatureValid: boolean;
  userId?: number | null;
  transactionId?: string;
  payload: Record<string, unknown>;
  responseBody?: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  await db.insert(webhookLogsTable).values({
    provider: "bitlabs",
    eventType: params.eventType ?? "callback",
    httpMethod: params.httpMethod,
    status: params.status,
    signatureValid: params.signatureValid,
    userId: params.userId ?? null,
    referenceId: params.transactionId || null,
    payload: JSON.stringify(params.payload),
    responseBody: params.responseBody || "",
    ipAddress: params.ipAddress || "",
    userAgent: params.userAgent || "",
  });
}

router.get("/", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const mode = String(req.query.mode || "surveys");

  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const settings = await getAdminSettings();
    const conversions = await db.select().from(offerwallConversionsTable)
      .where(eq(offerwallConversionsTable.userId, userId))
      .orderBy(desc(offerwallConversionsTable.createdAt))
      .limit(12);

    const [stats] = await db.select({
      completedCount: sql<number>`count(*)::int`,
      totalReward: sql<number>`coalesce(sum(${offerwallConversionsTable.rewardAmount}::numeric), 0)`,
      totalRevenue: sql<number>`coalesce(sum(${offerwallConversionsTable.revenueUsd}::numeric), 0)`,
    }).from(offerwallConversionsTable)
      .where(eq(offerwallConversionsTable.userId, userId));

    const configured = Boolean(settings.bitlabsEnabled && settings.bitlabsApiKey && settings.bitlabsSecretKey);
    const offerwallUrl = configured && user.telegramId
      ? buildBitLabsOfferwallUrl({
        uid: user.telegramId,
        token: settings.bitlabsApiKey,
        displayMode: mode === "offers" ? "offers" : "surveys",
        theme: String(req.query.theme || "").toUpperCase() === "LIGHT" ? "LIGHT" : "DARK",
        username: user.username || user.name,
        extra: {
          ref: user.referralCode,
          tg_uid: user.telegramId,
        },
      })
      : "";

    res.json({
      provider: "bitlabs",
      mode,
      enabled: settings.bitlabsEnabled,
      maintenance: settings.bitlabsMaintenanceMode,
      configured,
      telegramUserId: user.telegramId || "",
      offerwallUrl,
      stats: {
        completedCount: Number(stats?.completedCount ?? 0),
        totalReward: Number(stats?.totalReward ?? 0),
        totalRevenue: Number(stats?.totalRevenue ?? 0),
      },
      recentCompletions: conversions
        .filter((item) => item.provider === "bitlabs")
        .map((item) => ({
          id: item.id,
          title: item.title || item.offerId || item.transactionId,
          transactionId: item.transactionId,
          reward: Number(item.rewardAmount),
          revenue: Number(item.revenueUsd),
          status: item.status,
          createdAt: item.createdAt.toISOString(),
          conversionType: item.conversionType,
        })),
    });
  } catch (err) {
    console.error("BitLabs offerwall error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

async function handleBitLabsCallback(req: any, res: any) {
  const rawPayload = {
    ...(typeof req.query === "object" ? req.query : {}),
    ...(req.body && typeof req.body === "object" ? req.body : {}),
  } as Record<string, unknown>;
  const parsed = parseBitLabsCallbackPayload(rawPayload);
  const ipAddress = getRequestIp(req.headers) || req.socket?.remoteAddress || "";
  const userAgent = typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : "";
  let resolvedUserId: number | null = null;

  try {
    const settings = await getAdminSettings();
    const signatureValid = verifyBitLabsSignature(req, settings.bitlabsSecretKey);

    if (!settings.bitlabsEnabled) {
      await logWebhookEvent({ httpMethod: req.method, status: "rejected_disabled", signatureValid, transactionId: parsed.transactionId, payload: rawPayload, responseBody: "BitLabs disabled", ipAddress, userAgent });
      res.status(403).json({ error: "BitLabs disabled" });
      return;
    }

    if (!parsed.uid || !parsed.transactionId || parsed.reward <= 0) {
      await logWebhookEvent({ eventType: "fraud", httpMethod: req.method, status: "invalid_payload", signatureValid, transactionId: parsed.transactionId, payload: rawPayload, responseBody: "Missing required fields", ipAddress, userAgent });
      res.status(400).json({ error: "Invalid callback payload" });
      return;
    }

    if (!isBitLabsRewardable(parsed.activityType)) {
      await logWebhookEvent({ httpMethod: req.method, status: "ignored_status", signatureValid, transactionId: parsed.transactionId, payload: rawPayload, responseBody: `Ignored activity type ${parsed.activityType}`, ipAddress, userAgent });
      res.json({ ok: true, ignored: true });
      return;
    }

    if (!signatureValid) {
      await logWebhookEvent({ eventType: "fraud", httpMethod: req.method, status: "invalid_signature", signatureValid: false, transactionId: parsed.transactionId, payload: rawPayload, responseBody: "Invalid hash", ipAddress, userAgent });
      res.status(403).json({ error: "Invalid callback signature" });
      return;
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.telegramId, parsed.uid)).limit(1);
    if (!user) {
      await logWebhookEvent({ eventType: "fraud", httpMethod: req.method, status: "unknown_user", signatureValid: true, transactionId: parsed.transactionId, payload: rawPayload, responseBody: "User not found", ipAddress, userAgent });
      res.status(404).json({ error: "User not found" });
      return;
    }
    resolvedUserId = user.id;

    const normalizedTransactionId = `bitlabs:${parsed.transactionId}`;
    const [existing] = await db.select().from(offerwallConversionsTable)
      .where(eq(offerwallConversionsTable.transactionId, normalizedTransactionId))
      .limit(1);

    if (existing) {
      await logWebhookEvent({ httpMethod: req.method, status: "duplicate", signatureValid: true, userId: user.id, transactionId: normalizedTransactionId, payload: rawPayload, responseBody: "Duplicate callback ignored", ipAddress, userAgent });
      res.json({ ok: true, duplicate: true });
      return;
    }

    const rewardType = parsed.activityType === "COMPLETE" || parsed.activityType === "COMPLETED" ? (parsed.offerId ? "bitlabs_offer" : "bitlabs_survey") : "bitlabs_survey";
    let creditedAmount = 0;

    await db.transaction(async (tx) => {
      const credit = await creditRewardWithVip({
        userId: user.id,
        baseAmount: parsed.reward,
        rewardType,
        description: `BitLabs reward (${parsed.transactionId})`,
        source: "bitlabs",
        referenceId: normalizedTransactionId,
        transactionMode: "single_total",
        metadata: {
          provider: "bitlabs",
          activityType: parsed.activityType,
          surveyId: parsed.surveyId,
          offerId: parsed.offerId,
          taskId: parsed.taskId,
          revenueUsd: parsed.revenueUsd,
        },
        executor: tx,
      });

      creditedAmount = credit.totalCredited;

      await tx.insert(offerwallConversionsTable).values({
        provider: "bitlabs",
        conversionType: rewardType === "bitlabs_offer" ? "offer" : "survey",
        userId: user.id,
        externalUserId: parsed.uid,
        transactionId: normalizedTransactionId,
        offerId: parsed.offerId || parsed.surveyId || null,
        taskId: parsed.taskId || null,
        title: parsed.title || null,
        status: "completed",
        rewardAmount: String(credit.totalCredited),
        revenueUsd: String(parsed.revenueUsd),
        multiplierApplied: String(credit.totalMultiplierApplied),
        sourceEvent: parsed.activityType,
        ipAddress,
        userAgent,
        rawPayload: JSON.stringify(rawPayload),
      });

      await logActivity({
        action: "bitlabs_reward_credited",
        entityType: "offerwall_conversions",
        entityId: normalizedTransactionId,
        userId: user.id,
        details: {
          activityType: parsed.activityType,
          rewardCredited: credit.totalCredited,
          revenueUsd: parsed.revenueUsd,
        },
        executor: tx,
      });
    });

    await logWebhookEvent({ httpMethod: req.method, status: "credited", signatureValid: true, userId: user.id, transactionId: normalizedTransactionId, payload: rawPayload, responseBody: JSON.stringify({ ok: true, rewardCredited: creditedAmount }), ipAddress, userAgent });
    res.json({ ok: true, rewardCredited: creditedAmount });
  } catch (err) {
    if (err instanceof Error && /duplicate key|unique/i.test(err.message)) {
      await logWebhookEvent({ httpMethod: req.method, status: "duplicate", signatureValid: true, userId: resolvedUserId, transactionId: `bitlabs:${parsed.transactionId}`, payload: rawPayload, responseBody: "Duplicate callback ignored", ipAddress, userAgent }).catch(() => {});
      res.json({ ok: true, duplicate: true });
      return;
    }
    console.error("BitLabs callback error:", err);
    await logWebhookEvent({ httpMethod: req.method, status: "server_error", signatureValid: false, userId: resolvedUserId, transactionId: parsed.transactionId, payload: rawPayload, responseBody: "Server error", ipAddress, userAgent }).catch(() => {});
    res.status(500).json({ error: "Server error" });
  }
}

router.get("/callback", handleBitLabsCallback);
router.post("/callback", handleBitLabsCallback);
router.get("/postback", handleBitLabsCallback);
router.post("/postback", handleBitLabsCallback);

export default router;
