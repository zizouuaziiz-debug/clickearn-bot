/**
 * Monlix integration service.
 *
 * Official docs: https://docs.monlix.com/
 * Integration methods: web reward sites, Android & iOS SDKs, S2S postbacks.
 *
 * Env vars:
 * - MONLIX_ENABLED
 * - MONLIX_PUBLISHER_ID
 * - MONLIX_API_KEY
 * - MONLIX_SECRET_KEY
 * - MONLIX_REWARD_MULTIPLIER (default 1)
 */

import crypto from "crypto";

export interface MonlixConfig {
  enabled: boolean;
  publisherId: string;
  apiKey: string;
  secretKey: string;
  rewardMultiplier: number;
}

export function getMonlixConfig(): MonlixConfig {
  return {
    enabled: process.env.MONLIX_ENABLED === "true",
    publisherId: process.env.MONLIX_PUBLISHER_ID || "",
    apiKey: process.env.MONLIX_API_KEY || "",
    secretKey: process.env.MONLIX_SECRET_KEY || "",
    rewardMultiplier: parseFloat(process.env.MONLIX_REWARD_MULTIPLIER || "1") || 1,
  };
}

export function buildOfferwallUrl(publisherId: string, apiKey: string, userId: string | number) {
  // Standard Monlix web offerwall URL. Confirm exact parameter names in dashboard.
  return `https://monlix.com/wall/${encodeURIComponent(publisherId)}?api_key=${encodeURIComponent(apiKey)}&user_id=${encodeURIComponent(String(userId))}`;
}

export function verifySignature(userId: string, transactionId: string, amount: string, secret: string, signature: string) {
  const expected = crypto.createHash("md5").update(`${userId}${transactionId}${amount}${secret}`).digest("hex");
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signature.toLowerCase());
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

export interface MonlixPostbackPayload {
  userId: string;
  transactionId: string;
  offerId?: string;
  offerName?: string;
  amount: string;
  payout: string;
  status: string; // "1" credit, "2" reversal
  signature: string;
  country?: string;
  ip?: string;
}

export function parsePostbackPayload(query: Record<string, unknown>): MonlixPostbackPayload | null {
  const userId = query.user_id ?? query.userId ?? query.uid ?? query.subId;
  const transactionId = query.transaction_id ?? query.transactionId ?? query.txn_id ?? query.txId;
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
    country: query.country ? String(query.country) : undefined,
    ip: query.ip ? String(query.ip) : undefined,
  };
}
