import { Router } from "express";
import { createHash } from "crypto";
import { requireAuth } from "../middleware/auth";
import { db } from "../db";
import {
  offerwallConversionsTable,
  adminSettingsTable,
  usersTable,
  webhookLogsTable,
} from "../db/index";
import { eq, and } from "drizzle-orm";
import { creditRewardWithVip, logActivity } from "../lib/finance";

const router = Router();

function verifyLootablySignature(
  placementId: string,
  uid: string,
  amount: string,
  tid: string,
  secret: string,
  hash: string
): boolean {
  // Lootably: SHA-1(placementId + uid + amount + tid + secret)
  const computed = createHash("sha1")
    .update(`${placementId}${uid}${amount}${tid}${secret}`)
    .digest("hex");
  return computed.toLowerCase() === String(hash).toLowerCase();
}

// GET /api/lootably/config
router.get("/config", requireAuth, async (req, res) => {
  const [settings] = await db.select().from(adminSettingsTable).limit(1);
  if (!settings?.lootablyEnabled) {
    return res.status(403).json({ error: "Lootably is not enabled" });
  }
  const user = req.user!;
  const baseUrl = process.env.APP_URL || `https://${req.headers.host}`;
  const postbackUrl = `${baseUrl}/api/lootably/postback`;
  const wallUrl =
    `https://wall.lootably.com/?placementID=${encodeURIComponent(settings.lootablyPlacementId)}` +
    `&uid=${user.userId}&callback=${encodeURIComponent(postbackUrl)}`;
  return res.json({
    enabled: true,
    wallUrl,
    rewardMultiplier: settings.lootablyRewardMultiplier,
    postbackUrl,
  });
});

// GET /api/lootably/postback  — called by Lootably servers on offer completion
router.get("/postback", async (req, res) => {
  const { uid, tid, amount, hash } = req.query as Record<string, string>;
  const ip = req.ip ?? "";
  const ua = String(req.headers["user-agent"] ?? "");

  if (!uid || !tid || !amount || !hash) {
    return res.status(400).send("MISSING_PARAMS");
  }

  const [settings] = await db.select().from(adminSettingsTable).limit(1);

  if (!settings?.lootablyEnabled) {
    await db.insert(webhookLogsTable).values({
      provider: "lootably", eventType: "callback", httpMethod: "GET",
      status: "rejected_disabled", signatureValid: false,
      referenceId: tid, payload: JSON.stringify(req.query),
      ipAddress: ip, userAgent: ua,
    });
    return res.status(200).send("1");
  }

  const sigValid = verifyLootablySignature(
    settings.lootablyPlacementId, uid, amount, tid, settings.lootablySecretKey, hash
  );

  if (!sigValid) {
    await db.insert(webhookLogsTable).values({
      provider: "lootably", eventType: "callback", httpMethod: "GET",
      status: "rejected_invalid_sig", signatureValid: false,
      referenceId: tid, payload: JSON.stringify(req.query),
      ipAddress: ip, userAgent: ua,
    });
    console.warn({ tid }, "Lootably: invalid signature");
    return res.status(200).send("1");
  }

  const userId = parseInt(uid, 10);
  const rewardRaw = parseFloat(amount);
  if (!Number.isFinite(userId) || !Number.isFinite(rewardRaw) || rewardRaw <= 0) {
    return res.status(200).send("1");
  }

  // Idempotency
  const existing = await db.select().from(offerwallConversionsTable)
    .where(and(
      eq(offerwallConversionsTable.provider, "lootably"),
      eq(offerwallConversionsTable.transactionId, tid),
    )).limit(1);
  if (existing.length > 0) {
    console.info({ tid }, "Lootably: duplicate ignored");
    return res.status(200).send("1");
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) return res.status(200).send("1");

  const multiplier = Number(settings.lootablyRewardMultiplier ?? 1);
  const rewardAmount = roundMoney(rewardRaw * multiplier);

  await db.insert(offerwallConversionsTable).values({
    provider: "lootably", conversionType: "offer",
    userId, externalUserId: String(uid),
    transactionId: tid, title: "Lootably Offer",
    status: "approved",
    rewardAmount: String(rewardAmount),
    revenueUsd: String(roundMoney(rewardRaw)),
    multiplierApplied: String(multiplier),
    rawPayload: JSON.stringify(req.query),
    ipAddress: ip, userAgent: ua,
  });

  await creditRewardWithVip({
    userId,
    baseAmount: rewardAmount,
    rewardType: "lootably_offer",
    description: `Lootably offer tid=${tid}`,
    source: "lootably",
    referenceId: tid,
  });

  await db.insert(webhookLogsTable).values({
    provider: "lootably", eventType: "callback", httpMethod: "GET",
    status: "credited", signatureValid: true,
    userId, referenceId: tid, payload: JSON.stringify(req.query),
    responseBody: "1", ipAddress: ip, userAgent: ua,
  });

  await logActivity({
    action: "lootably_reward_credited",
    entityType: "offerwall_conversions",
    entityId: tid,
    userId,
    details: { provider: "lootably", rewardAmount },
  });

  console.info({ userId, rewardAmount, tid }, "Lootably reward credited");
  return res.status(200).send("1");
});

function roundMoney(value: number) {
  return Number((Number.isFinite(value) ? value : 0).toFixed(4));
}

export default router;
