/**
 * EarnWall routes.
 *
 * - GET /api/earnwall/config      -> offerwall, video ads, and surveys URLs
 * - GET /api/earnwall/postback    -> S2S conversion callback
 */

import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { processStandardOfferwallPostback } from "../lib/offerwall-helpers";
import {
  buildOfferwallUrl,
  buildSurveysUrl,
  buildVideoAdsUrl,
  getEarnWallConfig,
  parsePostbackPayload,
  verifySignature,
} from "../services/earnwall";

const router = Router();

router.get("/config", requireAuth, async (req, res) => {
  const config = getEarnWallConfig();
  if (!config.enabled) {
    res.status(503).json({ error: "EarnWall is not enabled" });
    return;
  }
  if (!config.publisherId || !config.apiKey) {
    res.status(500).json({ error: "EarnWall publisher ID or API key is not configured" });
    return;
  }

  const userId = req.user!.userId;
  res.json({
    enabled: true,
    offerwallUrl: buildOfferwallUrl(config.publisherId, config.apiKey, userId),
    videoAdsUrl: buildVideoAdsUrl(config.publisherId, config.apiKey, userId),
    surveysUrl: buildSurveysUrl(config.publisherId, config.apiKey, userId),
    postbackUrl: `${req.headers["x-forwarded-proto"] || "http"}://${req.headers.host}/api/earnwall/postback`,
  });
});

router.get("/postback", async (req, res) => {
  const config = getEarnWallConfig();
  const payload = parsePostbackPayload(req.query as Record<string, unknown>);
  const rawPayload = req.originalUrl.split("?")[1] ?? "";

  const result = await processStandardOfferwallPostback({
    provider: "earnwall",
    secretKey: config.secretKey,
    rewardMultiplier: config.rewardMultiplier,
    payload,
    rawPayload,
    httpMethod: "GET",
    ipAddress: req.socket.remoteAddress ?? undefined,
    userAgent: req.headers["user-agent"] ?? undefined,
    verifySignature: (p, secret) => verifySignature(p.userId, p.transactionId, p.amount, secret, p.signature),
    rewardType: (p) => {
      if (p.conversionType === "survey") return "survey_reward";
      if (p.conversionType === "video") return "ad_reward";
      return "offer_reward";
    },
  });

  res.status(result.status).send(result.body);
});

export default router;
