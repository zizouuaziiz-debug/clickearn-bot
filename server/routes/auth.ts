import { Router } from "express";
import { db, usersTable } from "../db/index";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { signToken, verifyToken } from "../middleware/auth";
import {
  extractReferralCodeFromStartParam,
  verifyTelegramInitData,
} from "../lib/telegram";
import {
  ensureWallet,
  getAdminSettings,
  getWalletSnapshot,
  logActivity,
  creditRewardWithVip,
} from "../lib/finance";
import { z } from "zod";
import { generateReferralCode } from "../lib/referralCode";

const router = Router();

const TelegramBody = z.object({
  initData: z.string().min(1),
});

const WebAdminLoginBody = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

/**
 * 👤 إنشاء اسم العرض
 */
function buildDisplayName(user: any) {
  return (
    [user.first_name, user.last_name].filter(Boolean).join(" ").trim() ||
    user.username ||
    `Telegram User ${user.id ?? "unknown"}`
  );
}

/**
 * 📦 تنسيق المستخدم للواجهة
 */
function formatUser(u: any, wallet: any) {
  return {
    id: u.id,
    telegramId: u.telegramId,
    username: u.username,
    firstName: u.firstName,
    lastName: u.lastName,
    profilePhoto: u.profilePhoto,
    languageCode: u.languageCode,
    name: u.name,

    balance: wallet.balance,
    pendingBalance: wallet.pendingBalance,
    totalEarned: wallet.totalEarned,
    totalWithdrawn: wallet.totalWithdrawn,

    vipLevel: u.vipLevel,
    referralCode: u.referralCode,

    // 🔥 مهم: يرجع للواجهة حتى لوحة الأدمن تشتغل
    isAdmin: u.isAdmin,

    isBanned: u.isBanned,
    createdAt: u.createdAt?.toISOString?.() || new Date().toISOString(),
  };
}

function formatWebAdminUser(username: string) {
  return {
    id: 0,
    telegramId: "",
    username,
    firstName: "Web",
    lastName: "Admin",
    profilePhoto: "",
    languageCode: "en",
    name: username,
    balance: 0,
    pendingBalance: 0,
    totalEarned: 0,
    totalWithdrawn: 0,
    vipLevel: 0,
    referralCode: "",
    isAdmin: true,
    isBanned: false,
    createdAt: new Date().toISOString(),
  };
}

async function verifyWebAdminCredentials(username: string, password: string) {
  const configuredUsername =
    process.env.WEB_ADMIN_USERNAME || process.env.ADMIN_USERNAME || "";
  const configuredPassword =
    process.env.WEB_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || "";
  const configuredPasswordHash =
    process.env.WEB_ADMIN_PASSWORD_HASH || process.env.ADMIN_PASSWORD_HASH || "";

  if (!configuredUsername || (!configuredPassword && !configuredPasswordHash)) {
    return { ok: false as const, reason: "missing-config" as const };
  }

  if (username !== configuredUsername) {
    return { ok: false as const, reason: "invalid-credentials" as const };
  }

  const passwordMatches = configuredPasswordHash
    ? await bcrypt.compare(password, configuredPasswordHash)
    : password === configuredPassword;

  if (!passwordMatches) {
    return { ok: false as const, reason: "invalid-credentials" as const };
  }

  return { ok: true as const, username: configuredUsername };
}

/**
 * 🔁 تسجيل الدخول عبر Telegram
 */
router.post("/telegram", async (req, res) => {
  const parsed = TelegramBody.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input" });
  }

  try {
    const settings = await getAdminSettings();
    const botToken =
      process.env.TELEGRAM_BOT_TOKEN || settings.telegramBotToken;

    if (!botToken) {
      return res.status(500).json({ error: "Telegram not configured" });
    }

    const verified = verifyTelegramInitData(parsed.data.initData, botToken);
    const telegramUser = verified?.user;

    if (!verified || !telegramUser?.id) {
      return res.status(401).json({ error: "Invalid Telegram session" });
    }

    const telegramId = String(telegramUser.id);
    const displayName = buildDisplayName(telegramUser);

    let [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.telegramId, telegramId))
      .limit(1);

    const profileUpdates = {
      telegramId,
      username: telegramUser.username || user?.username || "",
      firstName: telegramUser.first_name || user?.firstName || "",
      lastName: telegramUser.last_name || user?.lastName || "",
      profilePhoto: telegramUser.photo_url || user?.profilePhoto || "",
      languageCode: telegramUser.language_code || user?.languageCode || "",
      name: displayName,
      updatedAt: new Date(),
    };

    // 👤 مستخدم موجود
    if (user) {
      if (user.isBanned) {
        return res.status(403).json({ error: "Account banned" });
      }

      const [updatedUser] = await db
        .update(usersTable)
        .set(profileUpdates)
        .where(eq(usersTable.id, user.id))
        .returning();

      user = updatedUser;

      await ensureWallet(user.id);
    }

    // 👤 مستخدم جديد
    else {
      const referralCode =
        extractReferralCodeFromStartParam(verified.startParam);

      const [referrer] = referralCode
        ? await db
            .select()
            .from(usersTable)
            .where(eq(usersTable.referralCode, referralCode))
            .limit(1)
        : [];

      const [newUser] = await db
        .insert(usersTable)
        .values({
          ...profileUpdates,
          referralCode: generateReferralCode(),
          referredBy: referrer?.id ?? null,
          isAdmin: false,
        })
        .returning();

      user = newUser;

      await ensureWallet(user.id);

      await logActivity({
        action: "user_created",
        entityType: "users",
        entityId: user.id,
        userId: user.id,
        details: {
          telegramId,
          referredBy: referrer?.id ?? null,
        },
      });
    }

    const walletSnapshot = await getWalletSnapshot(user.id);

    /**
     * 🔥 أهم جزء: نرجع isAdmin داخل JWT (حل مشكلة لوحة الأدمن)
     */
    const token = signToken({
      userId: user.id,
      telegramId,
      isAdmin: user.isAdmin,
    });

    return res.json({
      token,
      user: formatUser(user, walletSnapshot),
    });
  } catch (err) {
    console.error("Telegram auth error:", err);
    return res.status(500).json({ error: "Telegram sign-in failed" });
  }
});

router.post("/web-admin/login", async (req, res) => {
  const parsed = WebAdminLoginBody.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input" });
  }

  try {
    const result = await verifyWebAdminCredentials(
      parsed.data.username.trim(),
      parsed.data.password
    );

    if (!result.ok) {
      return res
        .status(result.reason === "missing-config" ? 500 : 401)
        .json({
          error:
            result.reason === "missing-config"
              ? "Web admin credentials are not configured"
              : "Invalid admin credentials",
        });
    }

    const token = signToken({
      userId: 0,
      telegramId: `web-admin:${result.username}`,
      isAdmin: true,
      authMethod: "web-admin",
      adminUsername: result.username,
    });

    return res.json({
      token,
      user: formatWebAdminUser(result.username),
    });
  } catch (err) {
    console.error("Web admin login error:", err);
    return res.status(500).json({ error: "Web admin sign-in failed" });
  }
});

/**
 * 👤 جلب المستخدم الحالي
 */
router.get("/me", async (req, res) => {
  try {
    const auth = req.headers.authorization;

    if (!auth?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = auth.split(" ")[1];
    const payload = verifyToken(token);

    if (payload.authMethod === "web-admin" && payload.isAdmin) {
      return res.json(formatWebAdminUser(payload.adminUsername || "web-admin"));
    }

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, payload.userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: "Not found" });
    }

    const walletSnapshot = await getWalletSnapshot(user.id);

    return res.json(formatUser(user, walletSnapshot));
  } catch (err) {
    console.error("GetMe error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
