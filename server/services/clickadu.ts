/**
 * Clickadu integration service.
 *
 * Clickadu is an ad network supporting pop, push, native, and video ads.
 * When no public API docs are available, the recommended integration is:
 * - Ad tag / script placement for display ads.
 * - Server-to-server reward callback for rewarded video / ad completions.
 *
 * Env vars:
 * - CLICKADU_ENABLED
 * - CLICKADU_PUBLISHER_ID
 * - CLICKADU_API_KEY
 * - CLICKADU_SECRET_KEY
 * - CLICKADU_REWARD_MULTIPLIER (default 1)
 */

import crypto from "crypto";

export interface ClickaduConfig {
  enabled: boolean;
  publisherId: string;
  apiKey: string;
  secretKey: string;
  rewardMultiplier: number;
}

export function getClickaduConfig(): ClickaduConfig {
  return {
    enabled: process.env.CLICKADU_ENABLED === "true",
    publisherId: process.env.CLICKADU_PUBLISHER_ID || "",
    apiKey: process.env.CLICKADU_API_KEY || "",
    secretKey: process.env.CLICKADU_SECRET_KEY || "",
    rewardMultiplier: parseFloat(process.env.CLICKADU_REWARD_MULTIPLIER || "1") || 1,
  };
}

export function buildAdTagUrl(publisherId: string, apiKey: string, userId: string | number) {
  return `https://publisher.clickadu.com/?pub=${encodeURIComponent(publisherId)}&api_key=${encodeURIComponent(apiKey)}&user_id=${encodeURIComponent(String(userId))}`;
}

export function verifySignature(userId: string, transactionId: string, amount: string, secret: string, signature: string) {
  const expected = crypto.createHash("sha256").update(`${userId}:${transactionId}:${amount}:${secret}`).digest("hex");
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signature.toLowerCase());
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

export interface ClickaduPostbackPayload {
  userId: string;
  transactionId: string;
  adUnitId?: string;
  adType?: string;
  amount: string;
  payout: string;
  status: string; // "1" completed, "2" reversed
  signature: string;
  ip?: string;
  country?: string;
}

export function parsePostbackPayload(query: Record<string, unknown>): ClickaduPostbackPayload | null {
  const userId = query.user_id ?? query.userId ?? query.uid;
  const transactionId = query.transaction_id ?? query.transactionId ?? query.txn_id ?? query.txId;
  const amount = query.amount ?? query.reward ?? query.value;
  const signature = query.signature ?? query.hash ?? query.sig;
  const status = query.status ?? "1";

  if (!userId || !transactionId || !amount || !signature) return null;

  return {
    userId: String(userId),
    transactionId: String(transactionId),
    adUnitId: query.ad_unit_id ? String(query.ad_unit_id) : undefined,
    adType: query.ad_type ? String(query.ad_type) : undefined,
    amount: String(amount),
    payout: query.revenue ?? query.payout ? String(query.revenue ?? query.payout) : "0",
    status: String(status),
    signature: String(signature),
    ip: query.ip ? String(query.ip) : undefined,
    country: query.country ? String(query.country) : undefined,
  };
}
