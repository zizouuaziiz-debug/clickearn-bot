import crypto from "crypto";

export interface VerifiedTelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

export interface VerifiedTelegramInitData {
  user: VerifiedTelegramUser | null;
  startParam: string;
  authDate: number | null;
}

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");

  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function extractReferralCodeFromStartParam(startParam?: string | null) {
  const value = (startParam || "").trim();
  if (!value) return "";
  if (value.startsWith("ref_")) return value.slice(4);
  return value;
}

export function verifyTelegramInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds = 60 * 60 * 24,
): VerifiedTelegramInitData | null {
  if (!initData || !botToken) return null;

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;

  const entries = Array.from(params.entries())
    .filter(([key]) => key !== "hash")
    .sort(([a], [b]) => a.localeCompare(b));

  const dataCheckString = entries.map(([key, value]) => `${key}=${value}`).join("\n");
  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const calculatedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  if (!safeCompare(calculatedHash, hash)) return null;

  const authDateRaw = params.get("auth_date");
  const authDate = authDateRaw ? Number(authDateRaw) : null;
  const now = Math.floor(Date.now() / 1000);
  if (authDate && (Number.isNaN(authDate) || now - authDate > maxAgeSeconds || authDate - now > 60)) {
    return null;
  }

  let user: VerifiedTelegramUser | null = null;
  const userRaw = params.get("user");
  if (userRaw) {
    try {
      user = JSON.parse(userRaw) as VerifiedTelegramUser;
    } catch {
      user = null;
    }
  }

  return {
    user,
    startParam: params.get("start_param") || "",
    authDate,
  };
}
