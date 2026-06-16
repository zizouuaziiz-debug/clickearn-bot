import { Router } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import {
  activityLogsTable,
  adRewardsTable,
  adUnitsTable,
  adminSettingsTable,
  announcementsTable,
  db,
  depositsTable,
  offerwallConversionsTable,
  referralsTable,
  tasksTable,
  transactionsTable,
  usersTable,
  vipLevelsTable,
  webhookLogsTable,
  withdrawalsTable,
} from "../db/index";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { adjustWalletByAdmin, ensureDefaultVipLevels, finalizeWithdrawal, getAdminSettings, getWalletSnapshot, logActivity } from "../lib/finance";
import { z } from "zod";

const router = Router();
router.use(requireAuth, requireAdmin);

function getBaseUrl(req: any) {
  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost:3000";
  const proto = req.headers["x-forwarded-proto"] || "http";
  return `${proto}://${host}`;
}

function mapUserRow(user: any, wallet: any) {
  return {
    id: user.id,
    name: user.name,
    telegramId: user.telegramId || "",
    username: user.username || "",
    languageCode: user.languageCode || "",
    balance: wallet?.balance ?? 0,
    vipLevel: user.vipLevel,
    isAdmin: user.isAdmin,
    isBanned: user.isBanned,
    totalEarned: wallet?.totalEarned ?? 0,
    createdAt: user.createdAt.toISOString(),
  };
}

async function getDailySeries(query: any) {
  const result = await db.execute(query);
  return (result.rows ?? []).map((row: any) => ({
    day: row.day,
    value: Number(row.value ?? 0),
  }));
}

router.get("/analytics", async (_req, res) => {
  try {
    const [{ totalUsers }] = await db.select({ totalUsers: sql<number>`count(*)::int` }).from(usersTable);
    const [{ activeUsers }] = await db.select({ activeUsers: sql<number>`count(*)::int` }).from(usersTable).where(eq(usersTable.isBanned, false));
    const [{ totalWithdrawals }] = await db.select({ totalWithdrawals: sql<number>`coalesce(sum(${withdrawalsTable.amount}::numeric),0)` }).from(withdrawalsTable).where(eq(withdrawalsTable.status, "approved"));
    const [{ pendingWithdrawals }] = await db.select({ pendingWithdrawals: sql<number>`count(*)::int` }).from(withdrawalsTable).where(eq(withdrawalsTable.status, "pending"));
    const [{ bitlabsRevenue }] = await db.select({ bitlabsRevenue: sql<number>`coalesce(sum(${offerwallConversionsTable.revenueUsd}::numeric),0)` }).from(offerwallConversionsTable).where(eq(offerwallConversionsTable.provider, "bitlabs"));
    const [{ adgemRevenue }] = await db.select({ adgemRevenue: sql<number>`coalesce(sum(${offerwallConversionsTable.revenueUsd}::numeric),0)` }).from(offerwallConversionsTable).where(eq(offerwallConversionsTable.provider, "adgem"));
    const [{ tadsRevenue }] = await db.select({ tadsRevenue: sql<number>`coalesce(sum(${adRewardsTable.revenue}::numeric),0)` }).from(adRewardsTable).where(eq(adRewardsTable.status, "completed"));
    const [{ bitlabsConversions }] = await db.select({ bitlabsConversions: sql<number>`count(*)::int` }).from(offerwallConversionsTable).where(eq(offerwallConversionsTable.provider, "bitlabs"));
    const [{ adgemConversions }] = await db.select({ adgemConversions: sql<number>`count(*)::int` }).from(offerwallConversionsTable).where(eq(offerwallConversionsTable.provider, "adgem"));
    const [{ fraudEvents }] = await db.select({ fraudEvents: sql<number>`count(*)::int` }).from(webhookLogsTable).where(eq(webhookLogsTable.eventType, "fraud"));
    const [{ totalEarnings }] = await db.select({ totalEarnings: sql<number>`coalesce(sum(${transactionsTable.amount}::numeric),0)` }).from(transactionsTable).where(eq(transactionsTable.direction, "credit"));

    const [todayRevenue] = await db.execute(sql`
      select coalesce(sum(value), 0) as value
      from (
        select ${offerwallConversionsTable.revenueUsd}::numeric as value
        from ${offerwallConversionsTable}
        where ${offerwallConversionsTable.createdAt} >= date_trunc('day', now())
        union all
        select ${adRewardsTable.revenue}::numeric as value
        from ${adRewardsTable}
        where ${adRewardsTable.completedAt} >= date_trunc('day', now())
      ) x
    `).then((r: any) => r.rows);

    const [weekRevenue] = await db.execute(sql`
      select coalesce(sum(value), 0) as value
      from (
        select ${offerwallConversionsTable.revenueUsd}::numeric as value
        from ${offerwallConversionsTable}
        where ${offerwallConversionsTable.createdAt} >= date_trunc('week', now())
        union all
        select ${adRewardsTable.revenue}::numeric as value
        from ${adRewardsTable}
        where ${adRewardsTable.completedAt} >= date_trunc('week', now())
      ) x
    `).then((r: any) => r.rows);

    const [monthRevenue] = await db.execute(sql`
      select coalesce(sum(value), 0) as value
      from (
        select ${offerwallConversionsTable.revenueUsd}::numeric as value
        from ${offerwallConversionsTable}
        where ${offerwallConversionsTable.createdAt} >= date_trunc('month', now())
        union all
        select ${adRewardsTable.revenue}::numeric as value
        from ${adRewardsTable}
        where ${adRewardsTable.completedAt} >= date_trunc('month', now())
      ) x
    `).then((r: any) => r.rows);

    const dauSeries = await getDailySeries(sql`
      select to_char(day, 'YYYY-MM-DD') as day, count(distinct user_id)::int as value
      from (
        select date_trunc('day', created_at) as day, user_id from ${transactionsTable}
        where created_at >= now() - interval '14 days'
        union all
        select date_trunc('day', created_at) as day, user_id from ${offerwallConversionsTable}
        where created_at >= now() - interval '14 days'
      ) t
      group by day
      order by day asc
    `);

    const growthSeries = await getDailySeries(sql`
      select to_char(date_trunc('day', ${usersTable.createdAt}), 'YYYY-MM-DD') as day, count(*)::int as value
      from ${usersTable}
      where ${usersTable.createdAt} >= now() - interval '14 days'
      group by date_trunc('day', ${usersTable.createdAt})
      order by date_trunc('day', ${usersTable.createdAt}) asc
    `);

    const withdrawalSeries = await getDailySeries(sql`
      select to_char(date_trunc('day', ${withdrawalsTable.createdAt}), 'YYYY-MM-DD') as day, coalesce(sum(${withdrawalsTable.amount}::numeric), 0) as value
      from ${withdrawalsTable}
      where ${withdrawalsTable.createdAt} >= now() - interval '14 days'
      group by date_trunc('day', ${withdrawalsTable.createdAt})
      order by date_trunc('day', ${withdrawalsTable.createdAt}) asc
    `);

    const providerSeries = await getDailySeries(sql`
      select to_char(date_trunc('day', ${offerwallConversionsTable.createdAt}), 'YYYY-MM-DD') as day, coalesce(sum(${offerwallConversionsTable.revenueUsd}::numeric), 0) as value
      from ${offerwallConversionsTable}
      where ${offerwallConversionsTable.createdAt} >= now() - interval '14 days'
      group by date_trunc('day', ${offerwallConversionsTable.createdAt})
      order by date_trunc('day', ${offerwallConversionsTable.createdAt}) asc
    `);

    const topUsersRows = await db.execute(sql`
      select u.id, u.name, u.telegram_id, coalesce(sum(c.reward_amount::numeric), 0) as reward_total, coalesce(sum(c.revenue_usd::numeric), 0) as revenue_total
      from offerwall_conversions c
      join users u on u.id = c.user_id
      group by u.id, u.name, u.telegram_id
      order by reward_total desc
      limit 10
    `);

    res.json({
      totalUsers: Number(totalUsers),
      activeUsers: Number(activeUsers),
      totalEarnings: Number(totalEarnings),
      totalWithdrawals: Number(totalWithdrawals),
      pendingWithdrawals: Number(pendingWithdrawals),
      revenueToday: Number(todayRevenue?.value ?? 0),
      revenueThisWeek: Number(weekRevenue?.value ?? 0),
      revenueThisMonth: Number(monthRevenue?.value ?? 0),
      bitlabsRevenue: Number(bitlabsRevenue),
      adgemRevenue: Number(adgemRevenue),
      tadsRevenue: Number(tadsRevenue),
      bitlabsConversions: Number(bitlabsConversions),
      adgemConversions: Number(adgemConversions),
      fraudEvents: Number(fraudEvents),
      estimatedNetRevenue: Number(bitlabsRevenue) + Number(adgemRevenue) + Number(tadsRevenue),
      topUsers: (topUsersRows.rows ?? []).map((row: any) => ({
        id: row.id,
        name: row.name,
        telegramId: row.telegram_id,
        rewardTotal: Number(row.reward_total ?? 0),
        revenueTotal: Number(row.revenue_total ?? 0),
      })),
      charts: {
        dau: dauSeries,
        userGrowth: growthSeries,
        withdrawals: withdrawalSeries,
        revenue: providerSeries,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/users", async (req, res) => {
  try {
    const q = String(req.query.q || "").toLowerCase().trim();
    const users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt)).limit(250);
    const walletSnapshots = new Map<number, Awaited<ReturnType<typeof getWalletSnapshot>>>(
      await Promise.all(users.map(async (user) => [user.id, await getWalletSnapshot(user.id)] as const)),
    );
    const filtered = q
      ? users.filter((u) => [u.name, u.username || "", u.telegramId || "", u.referralCode || ""].some((value) => value.toLowerCase().includes(q)))
      : users;
    res.json(filtered.map((u) => mapUserRow(u, walletSnapshots.get(u.id))));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

const UpdateUserBody = z.object({
  balanceAdjustment: z.number().optional(),
  vipLevel: z.number().min(0).max(99).optional(),
  isAdmin: z.boolean().optional(),
  isBanned: z.boolean().optional(),
  name: z.string().optional(),
});

router.patch("/users/:userId", async (req, res) => {
  const userId = Number(req.params.userId);
  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success || Number.isNaN(userId)) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.vipLevel != null) updates.vipLevel = parsed.data.vipLevel;
  if (parsed.data.isAdmin != null) updates.isAdmin = parsed.data.isAdmin;
  if (parsed.data.isBanned != null) updates.isBanned = parsed.data.isBanned;
  if (parsed.data.name != null) updates.name = parsed.data.name;

  try {
    const actorUserId = (req as any).user.userId as number;
    if (parsed.data.balanceAdjustment != null && parsed.data.balanceAdjustment !== 0) {
      await adjustWalletByAdmin({
        userId,
        amount: parsed.data.balanceAdjustment,
        description: `Admin balance adjustment (${parsed.data.balanceAdjustment > 0 ? "+" : ""}${parsed.data.balanceAdjustment})`,
        actorUserId,
      });
    }
    const [updated] = await db.update(usersTable).set(updates as any).where(eq(usersTable.id, userId)).returning();
    if (!updated) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const walletSnapshot = await getWalletSnapshot(updated.id);
    await logActivity({
      action: "user_updated_by_admin",
      entityType: "users",
      entityId: updated.id,
      userId: updated.id,
      actorUserId,
      details: parsed.data,
    });
    res.json(mapUserRow(updated, walletSnapshot));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/users/:userId/activity", async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (Number.isNaN(userId)) {
      res.status(400).json({ error: "Invalid user ID" });
      return;
    }
    const logs = await db.select().from(activityLogsTable).where(eq(activityLogsTable.userId, userId)).orderBy(desc(activityLogsTable.createdAt)).limit(100);
    res.json(logs.map((item) => ({
      id: item.id,
      action: item.action,
      entityType: item.entityType,
      entityId: item.entityId || "",
      details: item.details || "",
      createdAt: item.createdAt.toISOString(),
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/transactions", async (_req, res) => {
  try {
    const txns = await db.select({
      txn: transactionsTable,
      user: { name: usersTable.name, username: usersTable.username, telegramId: usersTable.telegramId },
    }).from(transactionsTable)
      .leftJoin(usersTable, eq(transactionsTable.userId, usersTable.id))
      .orderBy(desc(transactionsTable.createdAt))
      .limit(400);
    res.json(txns.map(({ txn, user }) => ({
      id: txn.id,
      userId: txn.userId,
      userName: user?.name ?? user?.username ?? "Unknown",
      telegramId: user?.telegramId ?? "",
      type: txn.type,
      category: txn.category,
      direction: txn.direction,
      amount: Number(txn.amount),
      status: txn.status,
      description: txn.description,
      source: txn.source,
      createdAt: txn.createdAt.toISOString(),
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/providers/:provider/conversions", async (req, res) => {
  const provider = String(req.params.provider);
  try {
    const rows = await db.select({
      conversion: offerwallConversionsTable,
      user: { name: usersTable.name, username: usersTable.username, telegramId: usersTable.telegramId },
    }).from(offerwallConversionsTable)
      .leftJoin(usersTable, eq(offerwallConversionsTable.userId, usersTable.id))
      .where(eq(offerwallConversionsTable.provider, provider))
      .orderBy(desc(offerwallConversionsTable.createdAt))
      .limit(300);
    res.json(rows.map(({ conversion, user }) => ({
      id: conversion.id,
      provider: conversion.provider,
      conversionType: conversion.conversionType,
      transactionId: conversion.transactionId,
      title: conversion.title || "",
      offerId: conversion.offerId || "",
      goalId: conversion.goalId || "",
      rewardAmount: Number(conversion.rewardAmount),
      revenueUsd: Number(conversion.revenueUsd),
      multiplierApplied: Number(conversion.multiplierApplied),
      status: conversion.status,
      userName: user?.name ?? user?.username ?? "Unknown",
      telegramId: user?.telegramId ?? "",
      createdAt: conversion.createdAt.toISOString(),
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/providers/:provider/postbacks", async (req, res) => {
  const provider = String(req.params.provider);
  try {
    const logs = await db.select().from(webhookLogsTable).where(eq(webhookLogsTable.provider, provider)).orderBy(desc(webhookLogsTable.createdAt)).limit(200);
    res.json(logs.map((log) => ({
      id: log.id,
      eventType: log.eventType,
      status: log.status,
      signatureValid: log.signatureValid,
      userId: log.userId,
      referenceId: log.referenceId || "",
      responseBody: log.responseBody || "",
      payload: log.payload,
      createdAt: log.createdAt.toISOString(),
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/referrals/stats", async (_req, res) => {
  try {
    const [{ totalReferrals }] = await db.select({ totalReferrals: sql<number>`count(*)::int` }).from(referralsTable);
    const [{ totalCommission }] = await db.select({ totalCommission: sql<number>`coalesce(sum(${referralsTable.totalCommission}::numeric), 0)` }).from(referralsTable);
    res.json({ totalReferrals: Number(totalReferrals), totalCommission: Number(totalCommission) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/settings", async (req, res) => {
  try {
    const settings = await getAdminSettings();
    const baseUrl = getBaseUrl(req);
    const bitlabsPostbackUrl = `${baseUrl}/api/surveys/callback`;
    const adgemPostbackUrl = `${baseUrl}/api/offers/postback`;
    res.json({
      ...settings,
      bitlabsPostbackUrl,
      adgemPostbackUrl,
      bitlabsWebhookExample: `${bitlabsPostbackUrl}?uid=[%UID%]&val=[%VAL%]&raw=[%RAW%]&tx=[%TX%]&type=[%TYPE%]&hash=[HASH]`,
      adgemWebhookExample: `${adgemPostbackUrl}?playerid={playerid}&amount={amount}&payout={payout}&campaign_id={campaign_id}&goal_id={goal_id}&transaction_id={transaction_id}&request_id={request_id}&verifier={verifier}`,
      rewardedAdReward: Number(settings.rewardedAdReward),
      interstitialAdReward: Number(settings.interstitialAdReward),
      bannerAdReward: Number(settings.bannerAdReward),
      referralSignupReward: Number(settings.referralSignupReward),
      referralCommissionRate: Number(settings.referralCommissionRate),
      withdrawalMinimum: Number(settings.withdrawalMinimum),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

const numericSettingSchema = z.union([z.number(), z.string()]).transform((value, ctx) => {
  const normalized = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(normalized)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Expected numeric value" });
    return z.NEVER;
  }
  return normalized;
});

const UpdateSettingsBody = z.object({
  telegramBotToken: z.string().optional(),
  telegramBotUsername: z.string().optional(),
  telegramMiniAppUrl: z.string().optional(),
  telegramStarsEnabled: z.boolean().optional(),
  tonWalletAddress: z.string().optional(),
  brandingName: z.string().optional(),
  brandingLogoUrl: z.string().optional(),
  defaultLocale: z.string().optional(),
  bitlabsEnabled: z.boolean().optional(),
  bitlabsMaintenanceMode: z.boolean().optional(),
  bitlabsApiKey: z.string().optional(),
  bitlabsAppId: z.string().optional(),
  bitlabsSecretKey: z.string().optional(),
  adgemEnabled: z.boolean().optional(),
  adgemPublisherId: z.string().optional(),
  adgemApiKey: z.string().optional(),
  adgemWallId: z.string().optional(),
  adgemPostbackSecret: z.string().optional(),
  taskBitlabsEnabled: z.boolean().optional(),
  taskAdgemEnabled: z.boolean().optional(),
  dailyBonusEnabled: z.boolean().optional(),
  referralTasksEnabled: z.boolean().optional(),
  tadsEnabled: z.boolean().optional(),
  tadsAppId: z.string().optional(),
  tadsSecretKey: z.string().optional(),
  tadsRewardedUnit: z.string().optional(),
  tadsInterstitialUnit: z.string().optional(),
  tadsBannerUnit: z.string().optional(),
  rewardedAdReward: numericSettingSchema.optional(),
  interstitialAdReward: numericSettingSchema.optional(),
  bannerAdReward: numericSettingSchema.optional(),
  referralSignupReward: numericSettingSchema.optional(),
  referralCommissionRate: numericSettingSchema.optional(),
  withdrawalMinimum: numericSettingSchema.optional(),
  withdrawalsEnabled: z.boolean().optional(),
});

router.patch("/settings", async (req, res) => {
  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  try {
    const settings = await getAdminSettings();
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    for (const [key, value] of Object.entries(parsed.data)) {
      updates[key] = typeof value === "number" ? String(value) : value;
    }
    const [updated] = await db.update(adminSettingsTable).set(updates as any).where(eq(adminSettingsTable.id, settings.id)).returning();
    await logActivity({
      action: "settings_updated",
      entityType: "admin_settings",
      entityId: updated.id,
      actorUserId: (req as any).user.userId,
      details: parsed.data,
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/ad-units", async (_req, res) => {
  try {
    const units = await db.select().from(adUnitsTable).orderBy(adUnitsTable.id);
    res.json(units.map((unit) => ({
      id: unit.id,
      name: unit.name,
      provider: unit.provider,
      adType: unit.adType,
      unitKey: unit.unitKey,
      placement: unit.placement,
      reward: Number(unit.reward),
      revenuePerView: Number(unit.revenuePerView),
      isActive: unit.isActive,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

const AdUnitBody = z.object({
  name: z.string().min(1),
  adType: z.enum(["rewarded", "interstitial", "banner"]),
  unitKey: z.string().min(1),
  placement: z.string().min(1),
  reward: z.number().min(0),
  revenuePerView: z.number().min(0).optional().default(0),
  isActive: z.boolean().optional().default(true),
});

router.post("/ad-units", async (req, res) => {
  const parsed = AdUnitBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  try {
    const [unit] = await db.insert(adUnitsTable).values({
      ...parsed.data,
      provider: "tads",
      reward: String(parsed.data.reward),
      revenuePerView: String(parsed.data.revenuePerView),
    }).returning();
    res.status(201).json(unit);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.patch("/ad-units/:id", async (req, res) => {
  const parsed = AdUnitBody.partial().safeParse(req.body);
  const id = Number(req.params.id);
  if (!parsed.success || Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  try {
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    Object.entries(parsed.data).forEach(([key, value]) => {
      updates[key] = typeof value === "number" ? String(value) : value;
    });
    const [unit] = await db.update(adUnitsTable).set(updates as any).where(eq(adUnitsTable.id, id)).returning();
    res.json(unit);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/vip-levels", async (_req, res) => {
  try {
    await ensureDefaultVipLevels();
    const rows = await db.select().from(vipLevelsTable).orderBy(vipLevelsTable.level);
    res.json(rows.map((item) => ({
      id: item.id,
      level: item.level,
      name: item.name,
      price: Number(item.price),
      benefits: JSON.parse(item.benefits || "[]"),
      multiplier: Number(item.multiplier),
      dailyLimit: item.dailyLimit,
      isActive: item.isActive,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

const VipLevelBody = z.object({
  level: z.number().int().min(0).optional(),
  name: z.string().min(1).optional(),
  price: z.number().min(0).optional(),
  benefits: z.array(z.string()).optional(),
  multiplier: z.number().min(1).optional(),
  dailyLimit: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

router.post("/vip-levels", async (req, res) => {
  const parsed = VipLevelBody.required({ level: true, name: true }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  try {
    const [vip] = await db.insert(vipLevelsTable).values({
      level: parsed.data.level!,
      name: parsed.data.name!,
      price: String(parsed.data.price ?? 0),
      benefits: JSON.stringify(parsed.data.benefits ?? []),
      multiplier: String(parsed.data.multiplier ?? 1),
      dailyLimit: parsed.data.dailyLimit ?? 0,
      isActive: parsed.data.isActive ?? true,
    }).returning();
    res.status(201).json(vip);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.patch("/vip-levels/:id", async (req, res) => {
  const parsed = VipLevelBody.safeParse(req.body);
  const id = Number(req.params.id);
  if (!parsed.success || Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  try {
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (parsed.data.level != null) updates.level = parsed.data.level;
    if (parsed.data.name != null) updates.name = parsed.data.name;
    if (parsed.data.price != null) updates.price = String(parsed.data.price);
    if (parsed.data.benefits != null) updates.benefits = JSON.stringify(parsed.data.benefits);
    if (parsed.data.multiplier != null) updates.multiplier = String(parsed.data.multiplier);
    if (parsed.data.dailyLimit != null) updates.dailyLimit = parsed.data.dailyLimit;
    if (parsed.data.isActive != null) updates.isActive = parsed.data.isActive;
    const [vip] = await db.update(vipLevelsTable).set(updates as any).where(eq(vipLevelsTable.id, id)).returning();
    res.json(vip);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/tasks", async (_req, res) => {
  try {
    const rows = await db.select().from(tasksTable).orderBy(desc(tasksTable.createdAt));
    res.json(rows.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      reward: Number(item.reward),
      type: item.type,
      isActive: item.isActive,
      createdAt: item.createdAt.toISOString(),
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

const TaskBody = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  reward: z.number().min(0),
  type: z.string().optional().default("general"),
  isActive: z.boolean().optional().default(true),
});

router.post("/tasks", async (req, res) => {
  const parsed = TaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  try {
    const [task] = await db.insert(tasksTable).values({
      title: parsed.data.title,
      description: parsed.data.description,
      reward: String(parsed.data.reward),
      type: parsed.data.type,
      isActive: parsed.data.isActive,
    }).returning();
    res.status(201).json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.patch("/tasks/:id", async (req, res) => {
  const parsed = TaskBody.partial().safeParse(req.body);
  const id = Number(req.params.id);
  if (!parsed.success || Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  try {
    const updates: Record<string, unknown> = {};
    if (parsed.data.title != null) updates.title = parsed.data.title;
    if (parsed.data.description != null) updates.description = parsed.data.description;
    if (parsed.data.reward != null) updates.reward = String(parsed.data.reward);
    if (parsed.data.type != null) updates.type = parsed.data.type;
    if (parsed.data.isActive != null) updates.isActive = parsed.data.isActive;
    const [task] = await db.update(tasksTable).set(updates as any).where(eq(tasksTable.id, id)).returning();
    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/tasks/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid task ID" });
    return;
  }
  try {
    await db.delete(tasksTable).where(eq(tasksTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/announcements", async (_req, res) => {
  try {
    const rows = await db.select().from(announcementsTable).orderBy(desc(announcementsTable.createdAt)).limit(100);
    res.json(rows.map((item) => ({
      id: item.id,
      title: item.title,
      body: item.body,
      audience: item.audience,
      locale: item.locale,
      isActive: item.isActive,
      createdAt: item.createdAt.toISOString(),
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

const AnnouncementBody = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  audience: z.string().optional().default("all"),
  locale: z.string().optional().default("all"),
  isActive: z.boolean().optional().default(true),
});

router.post("/announcements", async (req, res) => {
  const parsed = AnnouncementBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  try {
    const [announcement] = await db.insert(announcementsTable).values({
      ...parsed.data,
      createdBy: (req as any).user.userId,
    }).returning();
    await logActivity({
      action: "announcement_created",
      entityType: "announcements",
      entityId: announcement.id,
      actorUserId: (req as any).user.userId,
      details: parsed.data,
    });
    res.status(201).json(announcement);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/withdrawals", async (_req, res) => {
  try {
    const rows = await db.select({
      withdrawal: withdrawalsTable,
      user: { name: usersTable.name, username: usersTable.username, telegramId: usersTable.telegramId },
    }).from(withdrawalsTable)
      .leftJoin(usersTable, eq(withdrawalsTable.userId, usersTable.id))
      .orderBy(desc(withdrawalsTable.createdAt))
      .limit(300);
    res.json(rows.map(({ withdrawal, user }) => ({
      id: withdrawal.id,
      userId: withdrawal.userId,
      userName: user?.name ?? user?.username ?? "Unknown",
      telegramId: user?.telegramId ?? "",
      amount: Number(withdrawal.amount),
      method: withdrawal.method,
      destination: withdrawal.destination,
      status: withdrawal.status,
      notes: withdrawal.notes || "",
      createdAt: withdrawal.createdAt.toISOString(),
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

const WithdrawalUpdateBody = z.object({
  status: z.enum(["pending", "approved", "rejected"]),
  notes: z.string().optional(),
});

router.patch("/withdrawals/:id", async (req, res) => {
  const parsed = WithdrawalUpdateBody.safeParse(req.body);
  const id = Number(req.params.id);
  if (!parsed.success || Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  try {
    const [withdrawal] = await db.select().from(withdrawalsTable).where(eq(withdrawalsTable.id, id)).limit(1);
    if (!withdrawal) {
      res.status(404).json({ error: "Withdrawal not found" });
      return;
    }
    if (withdrawal.status === "pending" && parsed.data.status !== "pending") {
      await finalizeWithdrawal({
        userId: withdrawal.userId,
        amount: Number(withdrawal.amount),
        approved: parsed.data.status === "approved",
        description: parsed.data.status === "approved" ? "Withdrawal approved" : "Withdrawal rejected",
        source: "admin",
        referenceId: String(withdrawal.id),
        metadata: { notes: parsed.data.notes || "" },
      });
    }
    const [updated] = await db.update(withdrawalsTable).set({
      status: parsed.data.status,
      notes: parsed.data.notes ?? withdrawal.notes,
      processedAt: parsed.data.status === "pending" ? withdrawal.processedAt : new Date(),
      updatedAt: new Date(),
    }).where(eq(withdrawalsTable.id, id)).returning();
    await logActivity({
      action: "withdrawal_status_updated",
      entityType: "withdrawals",
      entityId: id,
      userId: withdrawal.userId,
      actorUserId: (req as any).user.userId,
      details: { status: parsed.data.status, notes: parsed.data.notes || "" },
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/deposits", async (_req, res) => {
  try {
    const rows = await db.select().from(depositsTable).orderBy(desc(depositsTable.createdAt)).limit(200);
    res.json(rows.map((item) => ({
      id: item.id,
      userId: item.userId,
      vipLevel: item.vipLevel,
      amount: Number(item.amount),
      method: item.method,
      status: item.status,
      createdAt: item.createdAt.toISOString(),
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/logs/activity", async (_req, res) => {
  try {
    const logs = await db.select().from(activityLogsTable).orderBy(desc(activityLogsTable.createdAt)).limit(300);
    res.json(logs.map((item) => ({
      id: item.id,
      userId: item.userId,
      actorUserId: item.actorUserId,
      action: item.action,
      entityType: item.entityType,
      entityId: item.entityId || "",
      details: item.details || "",
      createdAt: item.createdAt.toISOString(),
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/logs/webhooks", async (_req, res) => {
  try {
    const logs = await db.select().from(webhookLogsTable).orderBy(desc(webhookLogsTable.createdAt)).limit(300);
    res.json(logs.map((item) => ({
      id: item.id,
      provider: item.provider,
      eventType: item.eventType,
      status: item.status,
      signatureValid: item.signatureValid,
      referenceId: item.referenceId || "",
      createdAt: item.createdAt.toISOString(),
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/logs/fraud", async (_req, res) => {
  try {
    const logs = await db.select().from(webhookLogsTable).where(eq(webhookLogsTable.eventType, "fraud")).orderBy(desc(webhookLogsTable.createdAt)).limit(200);
    res.json(logs.map((item) => ({
      id: item.id,
      provider: item.provider,
      status: item.status,
      referenceId: item.referenceId || "",
      payload: item.payload,
      createdAt: item.createdAt.toISOString(),
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/reports/export", async (_req, res) => {
  try {
    const [analytics, users, transactions, conversions] = await Promise.all([
      db.select({ totalUsers: sql<number>`count(*)::int` }).from(usersTable),
      db.select().from(usersTable).limit(100),
      db.select().from(transactionsTable).orderBy(desc(transactionsTable.createdAt)).limit(100),
      db.select().from(offerwallConversionsTable).orderBy(desc(offerwallConversionsTable.createdAt)).limit(100),
    ]);
    res.json({
      generatedAt: new Date().toISOString(),
      analytics: analytics[0],
      users,
      transactions,
      conversions,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
