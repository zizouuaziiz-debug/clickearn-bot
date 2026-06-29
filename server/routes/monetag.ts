import { Router } from "express";
import { randomBytes } from "crypto";
import { requireAuth } from "../middleware/auth";
import { db } from "../db";
import {
  adminSettingsTable,
  adRewardsTable,
  adUnitsTable,
  webhookLogsTable,
} from "../db/index";
import { eq, and } from "drizzle-orm";
import { creditRewardWithVip, logActivity, roundMoney } from "../lib/finance";

const router = Router();

// Simple in-process cooldown map (1 ad per user per 5 min)
const COOLDOWN_MS = 5 * 60 * 1000;
const lastAdTime = new Map<number, number>();

// GET /api/monetag/config
router.get("/config", requireAuth, async (req, res) => {
  const [settings] = await db.select().from(adminSettingsTable).limit(1);
  if (!settings?.monetagEnabled) {
    return res.status(403).json({ error: "Monetag is not enabled" });
  }
  return res.json({
    enabled: true,
    zoneId: settings.monetagZoneId,
    rewardedReward: settings.monetagRewardedReward,
  });
});

// POST /api/monetag/session/start
router.post("/session/start", requireAuth, async (req, res) => {
  const [settings] = await db.select().from(adminSettingsTable).limit(1);
  if (!settings?.monetagEnabled) {
    return res.status(403).json({ error: "Monetag is not enabled" });
  }

  const user = req.user!;
  const now = Date.now();
  const last = lastAdTime.get(user.userId) ?? 0;
  if (now - last < COOLDOWN_MS) {
    const remaining = Math.ceil((COOLDOWN_MS - (now - last)) / 1000);
    return res.status(429).json({ error: `Please wait ${remaining}s before watching another ad` });
  }

  const sessionToken = randomBytes(32).toString("hex");

  const [unit] = await db.select().from(adUnitsTable)
    .where(and(eq(adUnitsTable.provider, "monetag"), eq(adUnitsTable.isActive, true)))
    .limit(1);

  const adUnitId = unit?.id ?? 0;
  const rewardAmount = Number(settings.monetagRewardedReward ?? 0.003);
  const revenueAmount = Number(settings.monetagRewardedRevenue ?? 0.006);

  const [inserted] = await db.insert(adRewardsTable).values({
    userId: user.userId,
    adUnitId,
    provider: "monetag",
    adType: "rewarded",
    status: "started",
    reward: String(rewardAmount.toFixed(4)),
    revenue: String(revenueAmount.toFixed(4)),
    verificationToken: sessionToken,
  }).returning();

  await logActivity({
    action: "monetag_session_started",
    entityType: "ad_rewards",
    entityId: inserted.id,
    userId: user.userId,
    details: { sessionToken },
  });

  console.info({ userId: user.userId, sessionId: inserted.id }, "Monetag session started");
  return res.json({
    sessionId: inserted.id,
    sessionToken,
    zoneId: settings.monetagZoneId,
  });
});

// POST /api/monetag/session/complete
router.post("/session/complete", requireAuth, async (req, res) => {
  const { sessionId, sessionToken } = req.body ?? {};
  if (!sessionId || !sessionToken) {
    return res.status(400).json({ error: "Missing sessionId or sessionToken" });
  }

  const user = req.user!;

  const [session] = await db.select().from(adRewardsTable)
    .where(and(
      eq(adRewardsTable.id, sessionId),
      eq(adRewardsTable.userId, user.userId),
      eq(adRewardsTable.provider, "monetag"),
    )).limit(1);

  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }
  if (session.verificationToken !== sessionToken) {
    await db.insert(webhookLogsTable).values({
      provider: "monetag", eventType: "session_complete", httpMethod: "POST",
      status: "rejected_invalid_token", signatureValid: false,
      userId: user.userId, referenceId: String(sessionId),
      payload: JSON.stringify(req.body),
    });
    return res.status(403).json({ error: "Invalid session token" });
  }
  if (session.status !== "started") {
    return res.status(409).json({ error: "Session already processed" });
  }

  const rewardAmount = Number(session.reward);

  await db.update(adRewardsTable)
    .set({ status: "completed", completedAt: new Date(), updatedAt: new Date() })
    .where(eq(adRewardsTable.id, sessionId));

  await creditRewardWithVip({
    userId: user.userId,
    baseAmount: rewardAmount,
    rewardType: "monetag_ad",
    description: `Monetag rewarded ad session=${sessionId}`,
    source: "monetag",
    referenceId: String(sessionId),
  });

  lastAdTime.set(user.userId, Date.now());

  await db.insert(webhookLogsTable).values({
    provider: "monetag", eventType: "session_complete", httpMethod: "POST",
    status: "credited", signatureValid: true,
    userId: user.userId, referenceId: String(sessionId),
    payload: JSON.stringify(req.body),
    responseBody: JSON.stringify({ success: true, reward: rewardAmount }),
  });

  await logActivity({
    action: "monetag_reward_credited",
    entityType: "ad_rewards",
    entityId: sessionId,
    userId: user.userId,
    details: { provider: "monetag", rewardAmount },
  });

  console.info({ userId: user.userId, rewardAmount, sessionId }, "Monetag reward credited");
  return res.json({ success: true, reward: rewardAmount });
});

// POST/GET /api/monetag/postback - يستقبل Postback من Monetag
router.all("/postback", async (req, res) => {
  const params = req.method === "GET" ? req.query : req.body;
  
  console.info({ params, method: req.method }, "Monetag postback received");

  const { 
    ymid,
    event,
    value,
    zone,
    sub,
    price,
    telegram_id
  } = params;

  await db.insert(webhookLogsTable).values({
    provider: "monetag",
    eventType: "postback",
    httpMethod: req.method,
    status: "received",
    signatureValid: true,
    userId: telegram_id ? Number(telegram_id) : null,
    referenceId: ymid ? String(ymid) : null,
    payload: JSON.stringify(params),
  });

  if (!ymid || !telegram_id) {
    return res.status(400).json({ error: "Missing ymid or telegram_id" });
  }

  try {
    const [session] = await db.select().from(adRewardsTable)
      .where(eq(adRewardsTable.id, Number(ymid)))
      .limit(1);

    if (!session) {
      console.warn(`Session not found for ymid: ${ymid}`);
      return res.json({ success: true, message: "Logged but no session found" });
    }

    if (session.status === "completed") {
      return res.json({ success: true, message: "Already completed" });
    }

    const rewardAmount = Number(session.reward);

    await db.update(adRewardsTable)
      .set({ status: "completed", completedAt: new Date(), updatedAt: new Date() })
      .where(eq(adRewardsTable.id, Number(ymid)));

    await creditRewardWithVip({
      userId: session.userId,
      baseAmount: rewardAmount,
      rewardType: "monetag_ad",
      description: `Monetag postback ymid=${ymid}`,
      source: "monetag",
      referenceId: String(ymid),
    });

    lastAdTime.set(session.userId, Date.now());

    await logActivity({
      action: "monetag_postback_credited",
      entityType: "ad_rewards",
      entityId: Number(ymid),
      userId: session.userId,
      details: { provider: "monetag", rewardAmount, source: "postback", event, value, price },
    });

    console.info({ userId: session.userId, rewardAmount, ymid }, "Monetag postback reward credited");

    return res.json({ success: true });
  } catch (error) {
    console.error("Monetag postback error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
