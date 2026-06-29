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

function verifyToroxSignature(
  userid: string,
  amount: string,
  tid: string,
  secret: string,
  hash: string
): boolean {
  // Torox: MD5(userid + amount + tid + secret)
  const computed = createHash("md5")
    .update(`${userid}${amount}${tid}${secret}`)
    .digest("hex");
  return computed.toLowerCase() === String(hash).toLowerCase();
}

// GET /api/torox/config
router.get("/config", requireAuth, async (req, res) => {
  const [settings] = await db.select().from(adminSettingsTable).limit(1);
  if (!settings?.toroxEnabled) {
    return res.status(403).json({ error: "Torox is not enabled" });
  }
  const user = req.user!;
  const baseUrl = process.env.APP_URL || `https://${req.headers.host}`;
  const postbackUrl = `${baseUrl}/api/torox/postback`;
  const wallUrl =
    `https://www.torox.io/ifr/?ident=${encodeURIComponent(settings.toroxAppId)}` +
    `&userid=${user.userId}&adformat=1`;
  return res.json({
    enabled: true,
    wallUrl,
    rewardMultiplier: settings.toroxRewardMultiplier,
    postbackUrl,
  });
});

// GET /api/torox/postback  — called by Torox servers on offer completion
router.get("/postback", async (req, res) => {
  const { userid, tid, amount, hash } = req.query as Record<string, string>;
  const ip = req.ip ?? "";
  const ua = String(req.headers["user-agent"] ?? "");

  if (!userid || !tid || !amount || !hash) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  const [settings] = await db.select().from(adminSettingsTable).limit(1);

  if (!settings?.toroxEnabled) {
    await db.insert(webhookLogsTable).values({
      provider: "torox", eventType: "callback", httpMethod: "GET",
      status: "rejected_disabled", signatureValid: false,
      referenceId: tid, payload: JSON.stringify(req.query),
      ipAddress: ip, userAgent: ua,
    });
    return res.status(200).json({ status: "ok" });
  }

  const sigValid = verifyToroxSignature(userid, amount, tid, settings.toroxSecretKey, hash);

  if (!sigValid) {
    await db.insert(webhookLogsTable).values({
      provider: "torox", eventType: "callback", httpMethod: "GET",
      status: "rejected_invalid_sig", signatureValid: false,
      referenceId: tid, payload: JSON.stringify(req.query),
      ipAddress: ip, userAgent: ua,
    });
    console.warn({ tid }, "Torox: invalid signature");
    return res.status(200).json({ status: "ok" });
  }

  const userId = parseInt(userid, 10);
  const rewardRaw = parseFloat(amount);
  if (!Number.isFinite(userId) || !Number.isFinite(rewardRaw) || rewardRaw <= 0) {
    return res.status(200).json({ status: "ok" });
  }

  const existing = await db.select().from(offerwallConversionsTable)
    .where(and(
      eq(offerwallConversionsTable.provider, "torox"),
      eq(offerwallConversionsTable.transactionId, tid),
    )).limit(1);
  // Idempotency
  if (existing.length > 0) {
    console.info({ tid }, "Torox: duplicate ignored");
    return res.status(200).json({ status: "ok" });
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) return res.status(200).json({ status: "ok" });

  const multiplier = Number(settings.toroxRewardMultiplier ?? 1);
  const rewardAmount = roundMoney(rewardRaw * multiplier);

  await db.insert(offerwallConversionsTable).values({
    provider: "torox", conversionType: "offer",
    userId, externalUserId: String(userid),
    transactionId: tid, title: "Torox Offer",
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
    rewardType: "torox_offer",
    description: `Torox offer tid=${tid}`,
    source: "torox",
    referenceId: tid,
  });

  await db.insert(webhookLogsTable).values({
    provider: "torox", eventType: "callback", httpMethod: "GET",
    status: "credited", signatureValid: true,
    userId, referenceId: tid, payload: JSON.stringify(req.query),
    responseBody: '{"status":"ok"}', ipAddress: ip, userAgent: ua,
  });

  await logActivity({
    action: "torox_reward_credited",
    entityType: "offerwall_conversions",
    entityId: tid,
    userId,
    details: { provider: "torox", rewardAmount },
  });

  console.info({ userId, rewardAmount, tid }, "Torox reward credited");
  return res.status(200).json({ status: "ok" });
});

function roundMoney(value: number) {
  return Number((Number.isFinite(value) ? value : 0).toFixed(4));
}

export default router;
