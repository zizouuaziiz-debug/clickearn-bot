/**
 * Rewards Offerwall routes.
 *
 * - GET /api/rewards-offerwall/config      -> offerwall URL
 * - GET /api/rewards-offerwall/postback    -> S2S conversion callback
 */

import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { processStandardOfferwallPostback } from "../lib/offerwall-helpers";
import {
  buildOfferwallUrl,
  getRewardsOfferwallConfig,
  parsePostbackPayload,
  verifySignature,
} from "../services/rewards-offerwall";

const router = Router();

router.get("/config", requireAuth, async (req, res) => {
  const config = getRewardsOfferwallConfig();
  if (!config.enabled) {
    res.status(503).json({ error: "Rewards Offerwall is not enabled" });
    return;
  }
  if (!config.publisherId || !config.apiKey) {
    res.status(500).json({ error: "Rewards Offerwall publisher ID or API key is not configured" });
    return;
  }

  const userId = req.user!.userId;
  res.json({
    enabled: true,
    offerwallUrl: buildOfferwallUrl(config.publisherId, config.apiKey, userId),
    postbackUrl: `${req.headers["x-forwarded-proto"] || "http"}://${req.headers.host}/api/rewards-offerwall/postback`,
  });
});

router.get("/postback", async (req, res) => {
  const config = getRewardsOfferwallConfig();
  const payload = parsePostbackPayload(req.query as Record<string, unknown>);
  const rawPayload = req.originalUrl.split("?")[1] ?? "";

  const result = await processStandardOfferwallPostback({
    provider: "rewards_offerwall",
    secretKey: config.secretKey,
    rewardMultiplier: config.rewardMultiplier,
    payload,
    rawPayload,
    httpMethod: "GET",
    ipAddress: req.socket.remoteAddress ?? undefined,
    userAgent: req.headers["user-agent"] ?? undefined,
    verifySignature: (p, secret) => verifySignature(p.userId, p.transactionId, p.amount, secret, p.signature),
    rewardType: (p) => (p.conversionType === "survey" ? "survey_reward" : "offer_reward"),
  });

  res.status(result.status).send(result.body);
});

export default router;
