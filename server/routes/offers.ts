import { Router, type Request, type Response } from "express";
import { desc, eq, sql } from "drizzle-orm";
import { db, offerwallConversionsTable, usersTable, webhookLogsTable } from "../db/index";
import { requireAuth } from "../middleware/auth";
import { buildAdGemApiUrl, detectAdGemConversionType, getRequestIp, parseAdGemCallbackPayload, verifyAdGemGetSignature, verifyAdGemPostSignature } from "../lib/offerwalls";
import { creditRewardWithVip, getAdminSettings, logActivity } from "../lib/finance";

const router = Router();

async function logWebhookEvent(params: {
  eventType?: string;
  httpMethod: string;
  status: string;
  signatureValid: boolean;
  userId?: number | null;
  transactionId?: string;
  payload: Record<string, unknown> | string;
  responseBody?: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  await db.insert(webhookLogsTable).values({
    provider: "adgem",
    eventType: params.eventType ?? "callback",
    httpMethod: params.httpMethod,
    status: params.status,
    signatureValid: params.signatureValid,
    userId: params.userId ?? null,
    referenceId: params.transactionId || null,
    payload: typeof params.payload === "string" ? params.payload : JSON.stringify(params.payload),
    responseBody: params.responseBody || "",
    ipAddress: params.ipAddress || "",
    userAgent: params.userAgent || "",
  });
}

router.get("/", requireAuth, async (req, res) => {
  const { userId } = req.user!;

  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const settings = await getAdminSettings();
    const configured = Boolean(settings.adgemEnabled && settings.adgemPublisherId);
    const ipAddress = getRequestIp(req.headers) || req.socket.remoteAddress || "127.0.0.1";
    const userAgent = typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : "Mozilla/5.0";

    let offers: any[] = [];
    if (configured && user.telegramId) {
      try {
        const apiUrl = buildAdGemApiUrl({
          appId: settings.adgemPublisherId,
          playerId: user.telegramId,
          ip: ipAddress,
          userAgent,
          platform: "web",
          limit: 24,
        });
        const response = await fetch(apiUrl, settings.adgemApiKey ? {
          headers: {
            Authorization: `Bearer ${settings.adgemApiKey}`,
            "x-api-key": settings.adgemApiKey,
          },
        } : undefined);
        const data = await response.json().catch(() => null);
        const apiOffers = Array.isArray(data?.data?.[0]?.data) ? data.data[0].data : [];
        offers = apiOffers.map((offer: any) => ({
          id: offer.campaign_id || offer.store_id || offer.name,
          title: offer.name,
          description: offer.short_description || offer.description || "",
          instructions: offer.instructions || "",
          reward: Number(offer.amount ?? 0),
          imageUrl: offer.icon || "",
          ctaLabel: "Start offer",
          ctaUrl: offer.url,
          category: detectAdGemConversionType(String(offer.tracking_type || ""), String(offer.name || "")),
          trackingType: String(offer.tracking_type || ""),
          completionDifficulty: Number(offer.completion_difficulty ?? 0),
        }));
      } catch (error) {
        console.error("AdGem offer API error:", error);
      }
    }

    const [stats] = await db.select({
      completedCount: sql<number>`count(*)::int`,
      totalReward: sql<number>`coalesce(sum(${offerwallConversionsTable.rewardAmount}::numeric), 0)`,
      totalRevenue: sql<number>`coalesce(sum(${offerwallConversionsTable.revenueUsd}::numeric), 0)`,
    }).from(offerwallConversionsTable)
      .where(eq(offerwallConversionsTable.provider, "adgem"));

    const recent = await db.select().from(offerwallConversionsTable)
      .where(eq(offerwallConversionsTable.userId, userId))
      .orderBy(desc(offerwallConversionsTable.createdAt))
      .limit(10);

    res.json({
      provider: "adgem",
      enabled: settings.adgemEnabled,
      configured,
      offers: offers.filter((item) => item.category !== "game"),
      games: offers.filter((item) => item.category === "game"),
      stats: {
        completedCount: Number(stats?.completedCount ?? 0),
        totalReward: Number(stats?.totalReward ?? 0),
        totalRevenue: Number(stats?.totalRevenue ?? 0),
      },
      recentCompletions: recent
        .filter((item) => item.provider === "adgem")
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
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

async function handleAdGemPostback(req: Request, res: Response) {
  const rawPayload = {
    ...(typeof req.query === "object" ? req.query : {}),
    ...(req.body && typeof req.body === "object" ? req.body : {}),
  } as Record<string, unknown>;
  const parsed = parseAdGemCallbackPayload(rawPayload);
  const ipAddress = getRequestIp(req.headers) || req.socket?.remoteAddress || "";
  const userAgent = typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : "";
  const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {});
  let resolvedUserId: number | null = null;

  try {
    const settings = await getAdminSettings();
    const signatureHeader = typeof req.headers.signature === "string" ? req.headers.signature : "";
    const signatureValid = req.method === "POST" && signatureHeader
      ? verifyAdGemPostSignature(rawBody, signatureHeader, settings.adgemPostbackSecret)
      : verifyAdGemGetSignature(req, settings.adgemPostbackSecret);

    if (!settings.adgemEnabled) {
      await logWebhookEvent({ httpMethod: req.method, status: "rejected_disabled", signatureValid, transactionId: parsed.transactionId, payload: rawPayload, responseBody: "AdGem disabled", ipAddress, userAgent });
      res.status(403).json({ error: "AdGem disabled" });
      return;
    }

    if (!signatureValid) {
      await logWebhookEvent({ eventType: "fraud", httpMethod: req.method, status: "invalid_signature", signatureValid: false, transactionId: parsed.transactionId || parsed.requestId, payload: rawPayload, responseBody: "Invalid verifier", ipAddress, userAgent });
      res.status(403).json({ error: "Invalid signature" });
      return;
    }

    if (!parsed.playerId || (!parsed.transactionId && !parsed.requestId) || parsed.reward <= 0) {
      await logWebhookEvent({ eventType: "fraud", httpMethod: req.method, status: "invalid_payload", signatureValid: true, transactionId: parsed.transactionId || parsed.requestId, payload: rawPayload, responseBody: "Missing required fields", ipAddress, userAgent });
      res.status(400).json({ error: "Invalid callback payload" });
      return;
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.telegramId, parsed.playerId)).limit(1);
    if (!user) {
      await logWebhookEvent({ eventType: "fraud", httpMethod: req.method, status: "unknown_user", signatureValid: true, transactionId: parsed.transactionId || parsed.requestId, payload: rawPayload, responseBody: "User not found", ipAddress, userAgent });
      res.status(404).json({ error: "User not found" });
      return;
    }
    resolvedUserId = user.id;

    const uniqueId = parsed.transactionId || parsed.requestId;
    const normalizedTransactionId = `adgem:${uniqueId}`;
    const [existing] = await db.select().from(offerwallConversionsTable)
      .where(eq(offerwallConversionsTable.transactionId, normalizedTransactionId))
      .limit(1);

    if (existing) {
      await logWebhookEvent({ httpMethod: req.method, status: "duplicate", signatureValid: true, userId: user.id, transactionId: normalizedTransactionId, payload: rawPayload, responseBody: "Duplicate callback ignored", ipAddress, userAgent });
      res.json({ ok: true, duplicate: true });
      return;
    }

    const conversionType = detectAdGemConversionType(parsed.trackingType, parsed.goalName);
    const rewardType = conversionType === "game" ? "adgem_game" : "adgem_offer";
    let creditedAmount = 0;

    await db.transaction(async (tx) => {
      const credit = await creditRewardWithVip({
        userId: user.id,
        baseAmount: parsed.reward,
        rewardType,
        description: `AdGem reward (${uniqueId})`,
        source: "adgem",
        referenceId: normalizedTransactionId,
        transactionMode: "single_total",
        metadata: {
          provider: "adgem",
          campaignId: parsed.campaignId,
          goalId: parsed.goalId,
          goalName: parsed.goalName,
          trackingType: parsed.trackingType,
          revenueUsd: parsed.revenueUsd,
        },
        executor: tx,
      });

      creditedAmount = credit.totalCredited;

      await tx.insert(offerwallConversionsTable).values({
        provider: "adgem",
        conversionType,
        userId: user.id,
        externalUserId: parsed.playerId,
        transactionId: normalizedTransactionId,
        offerId: parsed.campaignId || null,
        goalId: parsed.goalId || null,
        title: parsed.goalName || parsed.offerName || null,
        status: "completed",
        rewardAmount: String(credit.totalCredited),
        revenueUsd: String(parsed.revenueUsd),
        multiplierApplied: String(credit.totalMultiplierApplied),
        sourceEvent: parsed.trackingType,
        ipAddress,
        userAgent,
        rawPayload: JSON.stringify(rawPayload),
      });

      await logActivity({
        action: "adgem_reward_credited",
        entityType: "offerwall_conversions",
        entityId: normalizedTransactionId,
        userId: user.id,
        details: {
          conversionType,
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
      await logWebhookEvent({ httpMethod: req.method, status: "duplicate", signatureValid: true, userId: resolvedUserId, transactionId: `adgem:${parsed.transactionId || parsed.requestId}`, payload: rawPayload, responseBody: "Duplicate callback ignored", ipAddress, userAgent }).catch(() => {});
      res.json({ ok: true, duplicate: true });
      return;
    }
    console.error("AdGem callback error:", err);
    await logWebhookEvent({ httpMethod: req.method, status: "server_error", signatureValid: false, userId: resolvedUserId, transactionId: parsed.transactionId || parsed.requestId, payload: rawPayload, responseBody: "Server error", ipAddress, userAgent }).catch(() => {});
    res.status(500).json({ error: "Server error" });
  }
}

router.get("/callback", handleAdGemPostback);
router.post("/callback", handleAdGemPostback);
router.get("/postback", handleAdGemPostback);
router.post("/postback", handleAdGemPostback);

router.post("/webhook", async (req: Request, res) => {
  const settings = await getAdminSettings();
  const rawBody = JSON.stringify(req.body ?? {});
  const signature = typeof req.headers.signature === "string" ? req.headers.signature : "";
  const signatureValid = verifyAdGemPostSignature(rawBody, signature, settings.adgemPostbackSecret);
  await logWebhookEvent({
    eventType: "offer_event",
    httpMethod: "POST",
    status: signatureValid ? "accepted" : "invalid_signature",
    signatureValid,
    payload: req.body ?? {},
    responseBody: signatureValid ? "OK" : "Invalid signature",
    ipAddress: getRequestIp(req.headers),
    userAgent: typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : "",
  });
  res.status(signatureValid ? 200 : 401).send(signatureValid ? "OK" : "Invalid signature");
});

export default router;
