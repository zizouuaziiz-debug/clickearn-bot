/**
 * GemiAds integration service.
 *
 * GemiAds is a mobile advertising / affiliate network.
 * Recommended integration:
 * - Offerwall / app listing via iframe or tracking link.
 * - Server-to-server postback on conversion.
 *
 * Env vars:
 * - GEMIADS_ENABLED
 * - GEMIADS_PUBLISHER_ID
 * - GEMIADS_API_KEY
 * - GEMIADS_SECRET_KEY
 * - GEMIADS_REWARD_MULTIPLIER (default 1)
 */

import crypto from "crypto";

export interface GemiAdsConfig {
  enabled: boolean;
  publisherId: string;
  apiKey: string;
  secretKey: string;
  rewardMultiplier: number;
}

export function getGemiAdsConfig(): GemiAdsConfig {
  return {
    enabled: process.env.GEMIADS_ENABLED === "true",
    publisherId: process.env.GEMIADS_PUBLISHER_ID || "",
    apiKey: process.env.GEMIADS_API_KEY || "",
    secretKey: process.env.GEMIADS_SECRET_KEY || "",
    rewardMultiplier: parseFloat(process.env.GEMIADS_REWARD_MULTIPLIER || "1") || 1,
  };
}

export function buildOfferwallUrl(publisherId: string, apiKey: string, userId: string | number) {
  return `https://gemiads.com/offerwall?pub=${encodeURIComponent(publisherId)}&api_key=${encodeURIComponent(apiKey)}&user_id=${encodeURIComponent(String(userId))}`;
}

export function verifySignature(userId: string, transactionId: string, amount: string, secret: string, signature: string) {
  const expected = crypto.createHash("md5").update(`${userId}${transactionId}${amount}${secret}`).digest("hex");
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signature.toLowerCase());
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

export interface GemiAdsPostbackPayload {
  userId: string;
  transactionId: string;
  offerId?: string;
  offerName?: string;
  amount: string;
  payout: string;
  status: string; // "1" credit, "2" reversal
  signature: string;
  ip?: string;
  country?: string;
}

export function parsePostbackPayload(query: Record<string, unknown>): GemiAdsPostbackPayload | null {
  const userId = query.user_id ?? query.userId ?? query.uid ?? query.subId;
  const transactionId = query.transaction_id ?? query.transactionId ?? query.txn_id ?? query.txId ?? query.click_id;
  const amount = query.amount ?? query.reward ?? query.value;
  const signature = query.signature ?? query.hash ?? query.sig;
  const status = query.status ?? "1";

  if (!userId || !transactionId || !amount || !signature) return null;

  return {
    userId: String(userId),
    transactionId: String(transactionId),
    offerId: query.offer_id ? String(query.offer_id) : undefined,
    offerName: query.offer_name ? String(query.offer_name) : undefined,
    amount: String(amount),
    payout: query.payout ? String(query.payout) : "0",
    status: String(status),
    signature: String(signature),
    ip: query.ip ? String(query.ip) : undefined,
    country: query.country ? String(query.country) : undefined,
  };
}
