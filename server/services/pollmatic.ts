/**
 * Pollmatic integration service.
 *
 * Official integration method:
 * - Offerwall: iframe or new-tab URL https://pollmatic.io/offerwall/{apiKey}/{userId}
 * - Surveys API: GET https://pollmatic.io/api/surveys.php?key={apiKey}&sub_id={userId}&client_ip={ip}&user_agent={ua}
 * - S2S Postback: HTTP POST with MD5(subId + transId + reward + secret) signature.
 *
 * Env vars:
 * - POLLMATIC_ENABLED
 * - POLLMATIC_API_KEY
 * - POLLMATIC_SECRET_KEY
 * - POLLMATIC_REWARD_MULTIPLIER (default 1)
 */

import crypto from "crypto";

export interface PollmaticConfig {
  enabled: boolean;
  apiKey: string;
  secretKey: string;
  rewardMultiplier: number;
}

export function getPollmaticConfig(): PollmaticConfig {
  return {
    enabled: process.env.POLLMATIC_ENABLED === "true",
    apiKey: process.env.POLLMATIC_API_KEY || "",
    secretKey: process.env.POLLMATIC_SECRET_KEY || "",
    rewardMultiplier: parseFloat(process.env.POLLMATIC_REWARD_MULTIPLIER || "1") || 1,
  };
}

export function buildOfferwallUrl(apiKey: string, userId: string | number) {
  return `https://pollmatic.io/offerwall/${encodeURIComponent(apiKey)}/${encodeURIComponent(String(userId))}`;
}

export function buildSurveysApiUrl(apiKey: string, userId: string | number, clientIp: string, userAgent: string) {
  const params = new URLSearchParams({
    key: apiKey,
    sub_id: String(userId),
    client_ip: clientIp,
    user_agent: userAgent,
  });
  return `https://pollmatic.io/api/surveys.php?${params.toString()}`;
}

export function verifySignature(subId: string, transId: string, reward: string, secret: string, signature: string) {
  const expected = crypto.createHash("md5").update(`${subId}${transId}${reward}${secret}`).digest("hex");
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signature.toLowerCase());
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

export interface PollmaticPostbackPayload {
  subId: string;
  transId: string;
  offer_id?: string;
  offer_name?: string;
  offer_type?: string;
  event_type?: string;
  reward: string;
  reward_name?: string;
  reward_value?: string;
  payout: string;
  userIp?: string;
  country?: string;
  status: string; // "0" pending, "1" complete, "2" chargeback
  debug?: string;
  signature: string;
}

export function parsePostbackPayload(body: Record<string, unknown>): PollmaticPostbackPayload | null {
  const subId = body.subId ?? body.subid ?? body.user_id;
  const transId = body.transId ?? body.transid ?? body.transaction_id;
  const reward = body.reward ?? body.amount;
  const signature = body.signature ?? body.hash;
  const status = body.status ?? "1";

  if (!subId || !transId || !reward || !signature) return null;

  return {
    subId: String(subId),
    transId: String(transId),
    offer_id: body.offer_id ? String(body.offer_id) : undefined,
    offer_name: body.offer_name ? String(body.offer_name) : undefined,
    offer_type: body.offer_type ? String(body.offer_type) : undefined,
    event_type: body.event_type ? String(body.event_type) : undefined,
    reward: String(reward),
    reward_name: body.reward_name ? String(body.reward_name) : undefined,
    reward_value: body.reward_value ? String(body.reward_value) : undefined,
    payout: body.payout ? String(body.payout) : "0",
    userIp: body.userIp ? String(body.userIp) : undefined,
    country: body.country ? String(body.country) : undefined,
    status: String(status),
    debug: body.debug ? String(body.debug) : undefined,
    signature: String(signature),
  };
}
