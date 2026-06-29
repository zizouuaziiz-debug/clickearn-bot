/**
 * Clickadu routes.
 *
 * - GET /api/clickadu/config      -> ad tag / script URL
 * - GET /api/clickadu/postback    -> rewarded ad completion callback
 */

import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { processStandardOfferwallPostback } from "../lib/offerwall-helpers";
import {
  buildAdTagUrl,
  getClickaduConfig,
  parsePostbackPayload,
  verifySignature,
} from "../services/clickadu";

const router = Router();

router.get("/config", requireAuth, async (req, res) => {
  const config = getClickaduConfig();
  if (!config.enabled) {
    res.status(503).json({ error: "Clickadu is not enabled" });
    return;
  }
  if (!config.publisherId || !config.apiKey) {
    res.status(500).json({ error: "Clickadu publisher ID or API key is not configured" });
    return;
  }

  const userId = req.user!.userId;
  res.json({
    enabled: true,
    adTagUrl: buildAdTagUrl(config.publisherId, config.apiKey, userId),
    postbackUrl: `${req.headers["x-forwarded-proto"] || "http"}://${req.headers.host}/api/clickadu/postback`,
  });
});

router.get("/postback", async (req, res) => {
  const config = getClickaduConfig();
  const payload = parsePostbackPayload(req.query as Record<string, unknown>);
  const rawPayload = req.originalUrl.split("?")[1] ?? "";

  const result = await processStandardOfferwallPostback({
    provider: "clickadu",
    secretKey: config.secretKey,
    rewardMultiplier: config.rewardMultiplier,
    payload,
    rawPayload,
    httpMethod: "GET",
    ipAddress: req.socket.remoteAddress ?? undefined,
    userAgent: req.headers["user-agent"] ?? undefined,
    verifySignature: (p, secret) => verifySignature(p.userId, p.transactionId, p.amount, secret, p.signature),
    rewardType: () => "ad_reward",
  });

  res.status(result.status).send(result.body);
});

export default router;
