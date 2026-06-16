import crypto from "crypto";

function pickFirst(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}

export function normalizeMoney(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(4)) : 0;
}

export function buildBitLabsOfferwallUrl(params: {
  uid: string;
  token: string;
  displayMode?: string;
  theme?: "LIGHT" | "DARK";
  username?: string;
  extra?: Record<string, string>;
}) {
  const url = new URL("https://web.bitlabs.ai/");
  url.searchParams.set("uid", params.uid);
  url.searchParams.set("token", params.token);
  if (params.displayMode) url.searchParams.set("display_mode", params.displayMode);
  if (params.theme) url.searchParams.set("theme", params.theme);
  if (params.username) url.searchParams.set("username", params.username);
  Object.entries(params.extra ?? {}).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });
  return url.toString();
}

export interface BitLabsCallbackPayload {
  uid: string;
  transactionId: string;
  reward: number;
  revenueUsd: number;
  activityType: string;
  surveyId: string;
  offerId: string;
  taskId: string;
  title: string;
  hash: string;
  rawPayload: Record<string, unknown>;
}

export function parseBitLabsCallbackPayload(source: Record<string, unknown>): BitLabsCallbackPayload {
  return {
    uid: pickFirst(source, ["uid", "UID", "user_id", "userid"]),
    transactionId: pickFirst(source, ["tx", "TX", "transaction_id", "transactionId"]),
    reward: normalizeMoney(pickFirst(source, ["val", "VAL", "amount", "reward"])),
    revenueUsd: normalizeMoney(pickFirst(source, ["raw", "RAW", "payout", "revenue"])),
    activityType: pickFirst(source, ["type", "TYPE", "activity_type", "activityType", "event"]).toUpperCase(),
    surveyId: pickFirst(source, ["survey_id", "surveyId"]),
    offerId: pickFirst(source, ["offer_id", "offerId"]),
    taskId: pickFirst(source, ["offer_task_id", "task_id", "goal_id"]),
    title: pickFirst(source, ["offer_name", "offer_title", "title", "goal_name"]),
    hash: pickFirst(source, ["hash", "HASH"]),
    rawPayload: source,
  };
}

function buildBaseUrl(req: any) {
  const proto = req.headers["x-forwarded-proto"] || (req.connection?.encrypted ? "https" : "http");
  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost:3000";
  return `${proto}://${host}`;
}

export function verifyBitLabsSignature(req: any, secretKey: string) {
  if (!secretKey) return false;
  const originalUrl = `${buildBaseUrl(req)}${req.originalUrl || req.url || ""}`;
  const splitUrl = originalUrl.split("&hash=");
  const hash = req.query?.hash || req.body?.hash;
  if (!hash || splitUrl.length < 2) return false;
  const expected = crypto.createHmac("sha1", secretKey).update(splitUrl[0]).digest("hex");
  return expected === String(hash).toLowerCase();
}

export function isBitLabsRewardable(activityType: string) {
  return ["COMPLETE", "COMPLETED", "SCREENOUT", "RECONCILIATION", "START_BONUS"].includes((activityType || "").toUpperCase());
}

export function buildAdGemApiUrl(params: {
  appId: string;
  playerId: string;
  ip: string;
  userAgent: string;
  platform: "web" | "ios" | "android";
  limit?: number;
  trackingTypes?: string[];
}) {
  const url = new URL("https://api.adgem.com/v1/wall/json");
  url.searchParams.set("appid", params.appId);
  url.searchParams.set("playerid", params.playerId.toLowerCase());
  url.searchParams.set("ip", params.ip);
  url.searchParams.set("useragent", params.userAgent);
  url.searchParams.set("platform", params.platform);
  if (params.limit) url.searchParams.set("limit", String(params.limit));
  if ((params.trackingTypes ?? []).length) {
    url.searchParams.set("tracking_types", params.trackingTypes!.join(","));
  }
  return url.toString();
}

export interface AdGemCallbackPayload {
  playerId: string;
  transactionId: string;
  requestId: string;
  verifier: string;
  reward: number;
  revenueUsd: number;
  campaignId: string;
  goalId: string;
  goalName: string;
  offerName: string;
  trackingType: string;
  rawPayload: Record<string, unknown>;
}

export function parseAdGemCallbackPayload(source: Record<string, unknown>): AdGemCallbackPayload {
  return {
    playerId: pickFirst(source, ["player_id", "playerid"]),
    transactionId: pickFirst(source, ["transaction_id"]),
    requestId: pickFirst(source, ["request_id"]),
    verifier: pickFirst(source, ["verifier"]),
    reward: normalizeMoney(pickFirst(source, ["amount"])),
    revenueUsd: normalizeMoney(pickFirst(source, ["payout"])),
    campaignId: pickFirst(source, ["campaign_id", "offer_id"]),
    goalId: pickFirst(source, ["goal_id"]),
    goalName: pickFirst(source, ["goal_name"]),
    offerName: pickFirst(source, ["offer_name"]),
    trackingType: pickFirst(source, ["tracking_type"]).toUpperCase(),
    rawPayload: source,
  };
}

export function verifyAdGemGetSignature(req: any, secretKey: string) {
  if (!secretKey) return false;
  const fullUrl = new URL(`${buildBaseUrl(req)}${req.originalUrl || req.url || ""}`);
  const verifier = fullUrl.searchParams.get("verifier");
  if (!verifier) return false;
  fullUrl.searchParams.delete("verifier");
  const expected = crypto.createHmac("sha256", secretKey).update(fullUrl.toString()).digest("hex");
  return expected === verifier;
}

export function verifyAdGemPostSignature(rawBody: string, signature: string, secretKey: string) {
  if (!rawBody || !signature || !secretKey) return false;
  const expected = crypto.createHmac("sha256", secretKey).update(rawBody, "utf8").digest("hex");
  return expected === signature;
}

export function detectAdGemConversionType(trackingType: string, goalName: string) {
  const text = `${trackingType} ${goalName}`.toLowerCase();
  if (text.includes("game") || text.includes("play") || ["CPI", "CPE"].includes(trackingType)) {
    return "game";
  }
  return "offer";
}

export function getRequestIp(headers: Record<string, string | string[] | undefined>) {
  const forwarded = headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded) return forwarded.split(",")[0].trim();
  if (Array.isArray(forwarded) && forwarded[0]) return forwarded[0];
  const realIp = headers["x-real-ip"];
  if (typeof realIp === "string" && realIp) return realIp;
  if (Array.isArray(realIp) && realIp[0]) return realIp[0];
  return "";
}
