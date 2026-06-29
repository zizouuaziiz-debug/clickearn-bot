/**
 * Pollmatic routes.
 *
 * - GET  /api/pollmatic/config      -> offerwall URL + surveys API proxy URL
 * - POST /api/pollmatic/postback    -> S2S conversion callback
 */

import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  buildOfferwallUrl,
  buildSurveysApiUrl,
  getPollmaticConfig,
  parsePostbackPayload,
  verifySignature,
} from "../services/pollmatic";
import {
  creditOfferwallReward,
  findUserById,
  isConversionDuplicate,
  logOfferwallActivity,
  logWebhook,
  recordConversion,
  updateConversionStatus,
} from "../lib/offerwall-helpers";

const router = Router();

router.get("/config", requireAuth, async (req, res) => {
  const config = getPollmaticConfig();
  if (!config.enabled) {
    res.status(503).json({ error: "Pollmatic is not enabled" });
    return;
  }
  if (!config.apiKey) {
    res.status(500).json({ error: "Pollmatic API key is not configured" });
    return;
  }

  const userId = req.user!.userId;
  const clientIp = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "") as string;
  const userAgent = req.headers["user-agent"] || "";

  res.json({
    enabled: true,
    offerwallUrl: buildOfferwallUrl(config.apiKey, userId),
    surveysApiUrl: buildSurveysApiUrl(config.apiKey, userId, clientIp.split(",")[0].trim(), userAgent),
    postbackUrl: `${req.headers["x-forwarded-proto"] || "http"}://${req.headers.host}/api/pollmatic/postback`,
  });
});

router.post("/postback", async (req, res) => {
  const config = getPollmaticConfig();
  const payload = parsePostbackPayload(req.body ?? {});
  const rawPayload = JSON.stringify(req.body ?? {});
  const ipAddress = req.socket.remoteAddress ?? undefined;
  const userAgent = req.headers["user-agent"] ?? undefined;

  if (!payload) {
    await logWebhook({
      provider: "pollmatic",
      eventType: "postback",
      httpMethod: "POST",
      status: "invalid_payload",
      signatureValid: false,
      referenceId: null,
      payload: rawPayload,
      responseBody: "Invalid payload",
      ipAddress,
      userAgent,
    });
    res.status(400).send("Invalid payload");
    return;
  }

  let signatureValid = false;
  try {
    signatureValid = verifySignature(payload.subId, payload.transId, payload.reward, config.secretKey, payload.signature);
  } catch {
    signatureValid = false;
  }

  if (!signatureValid) {
    await logWebhook({
      provider: "pollmatic",
      eventType: "postback",
      httpMethod: "POST",
      status: "invalid_signature",
      signatureValid: false,
      referenceId: payload.transId,
      payload: rawPayload,
      responseBody: "Invalid signature",
      ipAddress,
      userAgent,
    });
    res.status(403).send("Invalid signature");
    return;
  }

  const userId = parseInt(payload.subId, 10);
  if (!Number.isFinite(userId)) {
    await logWebhook({
      provider: "pollmatic",
      eventType: "postback",
      httpMethod: "POST",
      status: "invalid_user",
      signatureValid: true,
      referenceId: payload.transId,
      payload: rawPayload,
      responseBody: "Invalid user",
      ipAddress,
      userAgent,
    });
    res.status(400).send("Invalid user");
    return;
  }

  const user = await findUserById(userId);
  if (!user) {
    await logWebhook({
      provider: "pollmatic",
      eventType: "postback",
      httpMethod: "POST",
      status: "user_not_found",
      signatureValid: true,
      userId,
      referenceId: payload.transId,
      payload: rawPayload,
      responseBody: "User not found",
      ipAddress,
      userAgent,
    });
    res.status(200).send("ok");
    return;
  }

  const duplicate = await isConversionDuplicate("pollmatic", payload.transId);

  if (payload.status === "2") {
    // Chargeback / reversal
    if (!duplicate) {
      await recordConversion({
        provider: "pollmatic",
        conversionType: payload.offer_type === "survey" ? "survey" : "offer",
        userId,
        externalUserId: payload.subId,
        transactionId: payload.transId,
        offerId: payload.offer_id,
        title: payload.offer_name,
        status: "reversed",
        rewardAmount: 0,
        revenueUsd: parseFloat(payload.payout) || 0,
        multiplierApplied: config.rewardMultiplier,
        sourceEvent: payload.event_type,
        ipAddress,
        userAgent,
        rawPayload,
      });
    } else {
      await updateConversionStatus(payload.transId, "reversed");
    }
    await logWebhook({
      provider: "pollmatic",
      eventType: "postback",
      httpMethod: "POST",
      status: "reversed",
      signatureValid: true,
      userId,
      referenceId: payload.transId,
      payload: rawPayload,
      responseBody: "ok",
      ipAddress,
      userAgent,
    });
    res.status(200).send("ok");
    return;
  }

  if (payload.status !== "1") {
    // Pending (status "0") - do not credit yet
    await recordConversion({
      provider: "pollmatic",
      conversionType: payload.offer_type === "survey" ? "survey" : "offer",
      userId,
      externalUserId: payload.subId,
      transactionId: payload.transId,
      offerId: payload.offer_id,
      title: payload.offer_name,
      status: "pending",
      rewardAmount: 0,
      revenueUsd: parseFloat(payload.payout) || 0,
      multiplierApplied: config.rewardMultiplier,
      sourceEvent: payload.event_type,
      ipAddress,
      userAgent,
      rawPayload,
    });
    await logWebhook({
      provider: "pollmatic",
      eventType: "postback",
      httpMethod: "POST",
      status: "pending",
      signatureValid: true,
      userId,
      referenceId: payload.transId,
      payload: rawPayload,
      responseBody: "ok",
      ipAddress,
      userAgent,
    });
    res.status(200).send("ok");
    return;
  }

  if (duplicate) {
    await logWebhook({
      provider: "pollmatic",
      eventType: "postback",
      httpMethod: "POST",
      status: "duplicate",
      signatureValid: true,
      userId,
      referenceId: payload.transId,
      payload: rawPayload,
      responseBody: "ok",
      ipAddress,
      userAgent,
    });
    res.status(200).send("ok");
    return;
  }

  const baseAmount = parseFloat(payload.reward) || 0;
  const revenueUsd = parseFloat(payload.payout) || 0;

  const credit = await creditOfferwallReward({
    userId,
    baseAmount,
    rewardType: payload.offer_type === "survey" ? "survey_reward" : "offer_reward",
    description: payload.offer_name || "Pollmatic reward",
    source: "pollmatic",
    referenceId: payload.transId,
    sourceMultiplier: config.rewardMultiplier,
    metadata: {
      offerId: payload.offer_id,
      offerType: payload.offer_type,
      eventType: payload.event_type,
      revenueUsd,
      country: payload.country,
    },
  });

  await recordConversion({
    provider: "pollmatic",
    conversionType: payload.offer_type === "survey" ? "survey" : "offer",
    userId,
    externalUserId: payload.subId,
    transactionId: payload.transId,
    offerId: payload.offer_id,
    title: payload.offer_name,
    status: "completed",
    rewardAmount: credit.totalCredited,
    revenueUsd,
    multiplierApplied: config.rewardMultiplier * credit.vipMultiplier,
    sourceEvent: payload.event_type,
    ipAddress,
    userAgent,
    rawPayload,
  });

  await logOfferwallActivity({
    action: "pollmatic_conversion_credited",
    userId,
    referenceId: payload.transId,
    details: {
      baseAmount,
      credited: credit.totalCredited,
      rewardMultiplier: config.rewardMultiplier,
      vipMultiplier: credit.vipMultiplier,
    },
  });

  await logWebhook({
    provider: "pollmatic",
    eventType: "postback",
    httpMethod: "POST",
    status: "credited",
    signatureValid: true,
    userId,
    referenceId: payload.transId,
    payload: rawPayload,
    responseBody: "ok",
    ipAddress,
    userAgent,
  });

  res.status(200).send("ok");
});

export default router;
