/**
 * Offerwall.me routes.
 *
 * - GET /api/offerwall-me/config      -> offerwall URL
 * - GET /api/offerwall-me/postback    -> S2S conversion callback
 */

import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { processStandardOfferwallPostback } from "../lib/offerwall-helpers";
import {
  buildOfferwallUrl,
  getOfferwallMeConfig,
  parsePostbackPayload,
  verifySignature,
} from "../services/offerwall-me";

const router = Router();

router.get("/config", requireAuth, async (req, res) => {
  const config = getOfferwallMeConfig();
  if (!config.enabled) {
    res.status(503).json({ error: "Offerwall.me is not enabled" });
    return;
  }
  if (!config.publisherId || !config.apiKey) {
    res.status(500).json({ error: "Offerwall.me publisher ID or API key is not configured" });
    return;
  }

  const userId = req.user!.userId;
  res.json({
    enabled: true,
    offerwallUrl: buildOfferwallUrl(config.publisherId, config.apiKey, userId),
    postbackUrl: `${req.headers["x-forwarded-proto"] || "http"}://${req.headers.host}/api/offerwall-me/postback`,
  });
});

router.get("/postback", async (req, res) => {
  const config = getOfferwallMeConfig();
  const payload = parsePostbackPayload(req.query as Record<string, unknown>);
  const rawPayload = req.originalUrl.split("?")[1] ?? "";

  const result = await processStandardOfferwallPostback({
    provider: "offerwall_me",
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
