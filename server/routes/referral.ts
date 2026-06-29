import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, referralsTable, transactionsTable, usersTable } from "../db/index";
import { getAdminSettings } from "../lib/finance";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const { userId } = req.user!;
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) { res.status(404).json({ error: "Not found" }); return; }
    const refs = await db.select().from(referralsTable).where(eq(referralsTable.referrerId, userId));
    const totalEarned = refs.reduce((sum, r) => sum + Number(r.signupReward) + Number(r.totalCommission), 0);
    const settings = await getAdminSettings();
    const commissions = await db.select().from(transactionsTable)
      .where(and(eq(transactionsTable.userId, userId), eq(transactionsTable.category, "referral_reward")))
      .orderBy(desc(transactionsTable.createdAt))
      .limit(20);
    const botUsername = settings.telegramBotUsername || process.env.TELEGRAM_BOT_USERNAME || "";
    const miniAppUrl = settings.telegramMiniAppUrl || "";
    const webReferralLink = miniAppUrl ? `${miniAppUrl}${miniAppUrl.includes("?") ? "&" : "?"}startapp=ref_${user.referralCode}` : "";
    const telegramReferralLink = botUsername ? `https://t.me/${botUsername}?startapp=ref_${user.referralCode}` : "";
    const referralLink = telegramReferralLink || webReferralLink;
    const shareText = `Join Earnora on Telegram and start earning. Use my link: ${referralLink}`;
    res.json({
      referralCode: user.referralCode,
      referralLink,
      webReferralLink,
      telegramReferralLink,
      telegramShareUrl: `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(shareText)}`,
      totalReferred: refs.length,
      totalEarned,
      signupReward: Number(settings.referralSignupReward),
      commissionRate: Number(settings.referralCommissionRate),
      recentCommissions: commissions.map((item) => ({
        id: item.id,
        amount: Number(item.amount),
        description: item.description,
        createdAt: item.createdAt.toISOString(),
      })),
    });
  } catch (err) { console.error(err); res.status(500).json({ error: "Server error" }); }
});

router.get("/referred", requireAuth, async (req, res) => {
  const { userId } = req.user!;
  try {
    const refs = await db.select().from(referralsTable).where(eq(referralsTable.referrerId, userId));
    const result = await Promise.all(refs.map(async r => {
      const [referred] = await db.select().from(usersTable).where(eq(usersTable.id, r.referredId)).limit(1);
      return {
        id: r.id,
        name: referred?.name ?? "Unknown",
        telegramId: referred?.telegramId ?? "",
        joinedAt: r.createdAt.toISOString(),
        earnings: Number(r.signupReward) + Number(r.totalCommission),
        signupReward: Number(r.signupReward),
        totalCommission: Number(r.totalCommission),
      };
    }));
    res.json(result);
  } catch (err) { console.error(err); res.status(500).json({ error: "Server error" }); }
});

export default router;
