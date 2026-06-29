/**
 * EarnWall integration service.
 *
 * EarnWall supports video ads, offers, surveys, shortlinks and instant postbacks.
 * Official website: https://earnwall.net/
 *
 * Env vars:
 * - EARNWALL_ENABLED
 * - EARNWALL_PUBLISHER_ID
 * - EARNWALL_API_KEY
 * - EARNWALL_SECRET_KEY
 * - EARNWALL_REWARD_MULTIPLIER (default 1)
 */

import crypto from "crypto";

export interface EarnWallConfig {
  enabled: boolean;
  publisherId: string;
  apiKey: string;
  secretKey: string;
  rewardMultiplier: number;
}

export function getEarnWallConfig(): EarnWallConfig {
  return {
    enabled: process.env.EARNWALL_ENABLED === "true",
    publisherId: process.env.EARNWALL_PUBLISHER_ID || "",
    apiKey: process.env.EARNWALL_API_KEY || "",
    secretKey: process.env.EARNWALL_SECRET_KEY || "",
    rewardMultiplier: parseFloat(process.env.EARNWALL_REWARD_MULTIPLIER || "1") || 1,
  };
}

export function buildOfferwallUrl(publisherId: string, apiKey: string, userId: string | number) {
  return `https://earnwall.net/offerwall?pub=${encodeURIComponent(publisherId)}&api_key=${encodeURIComponent(apiKey)}&user_id=${encodeURIComponent(String(userId))}`;
}

export function buildVideoAdsUrl(publisherId: string, apiKey: string, userId: string | number) {
  return `https://earnwall.net/videos?pub=${encodeURIComponent(publisherId)}&api_key=${encodeURIComponent(apiKey)}&user_id=${encodeURIComponent(String(userId))}`;
}

export function buildSurveysUrl(publisherId: string, apiKey: string, userId: string | number) {
  return `https://earnwall.net/surveys?pub=${encodeURIComponent(publisherId)}&api_key=${encodeURIComponent(apiKey)}&user_id=${encodeURIComponent(String(userId))}`;
}

export function verifySignature(userId: string, transactionId: string, amount: string, secret: string, signature: string) {
  const expected = crypto.createHash("sha256").update(`${userId}${transactionId}${amount}${secret}`).digest("hex");
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signature.toLowerCase());
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

export interface EarnWallPostbackPayload {
  userId: string;
  transactionId: string;
  offerId?: string;
  offerName?: string;
  conversionType: string; // "offer", "survey", "video"
  amount: string;
  payout: string;
  status: string; // "1" completed, "2" reversed
  signature: string;
  ip?: string;
  country?: string;
}

export function parsePostbackPayload(query: Record<string, unknown>): EarnWallPostbackPayload | null {
  const userId = query.user_id ?? query.userId ?? query.uid ?? query.subId;
  const transactionId = query.transaction_id ?? query.transactionId ?? query.txn_id ?? query.txId;
  const amount = query.amount ?? query.reward ?? query.value;
  const signature = query.signature ?? query.hash ?? query.sig;
  const status = query.status ?? "1";
  const conversionType = query.type ?? query.conversion_type ?? "offer";

  if (!userId || !transactionId || !amount || !signature) return null;

  return {
    userId: String(userId),
    transactionId: String(transactionId),
    offerId: query.offer_id ? String(query.offer_id) : undefined,
    offerName: query.offer_name ? String(query.offer_name) : undefined,
    conversionType: String(conversionType),
    amount: String(amount),
    payout: query.payout ? String(query.payout) : "0",
    status: String(status),
    signature: String(signature),
    ip: query.ip ? String(query.ip) : undefined,
    country: query.country ? String(query.country) : undefined,
  };
}
