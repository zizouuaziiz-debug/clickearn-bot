import { Router } from "express";
import { desc, eq, ilike, or, sql } from "drizzle-orm";
import {
  activityLogsTable,
  adRewardsTable,
  adminSettingsTable,
  announcementsTable,
  db,
  offerwallConversionsTable,
  tasksTable,
  transactionsTable,
  usersTable,
  vipLevelsTable,
  webhookLogsTable,
  withdrawalsTable,
  walletsTable,
} from "../db/index";
import { requireAuth, requireAdmin } from "../middleware/auth";
import {
  adjustWalletByAdmin,
  ensureDefaultVipLevels,
  finalizeWithdrawal,
  getAdminSettings,
  getWalletSnapshot,
  logActivity,
} from "../lib/finance";
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

/* ─── ANALYTICS ─────────────────────────────── */

router.get("/analytics", async (_req, res) => {
  try {
    const [{ totalUsers }] = await db
      .select({ totalUsers: sql<number>`count(*)::int` })
      .from(usersTable);

    const [{ activeUsers }] = await db
      .select({ activeUsers: sql<number>`count(*)::int` })
      .from(usersTable)
      .where(eq(usersTable.isBanned, false));

    const [{ totalWithdrawals }] = await db
      .select({ totalWithdrawals: sql<number>`coalesce(sum(${withdrawalsTable.amount}::numeric),0)` })
      .from(withdrawalsTable)
      .where(eq(withdrawalsTable.status, "approved"));

    const [{ pendingWithdrawals }] = await db
      .select({ pendingWithdrawals: sql<number>`count(*)::int` })
      .from(withdrawalsTable)
      .where(eq(withdrawalsTable.status, "pending"));

    const [{ cpxRevenue }] = await db
      .select({ cpxRevenue: sql<number>`coalesce(sum(${offerwallConversionsTable.revenueUsd}::numeric),0)` })
      .from(offerwallConversionsTable)
      .where(eq(offerwallConversionsTable.provider, "cpx_research"));

    const [{ adgemRevenue }] = await db
      .select({ adgemRevenue: sql<number>`coalesce(sum(${offerwallConversionsTable.revenueUsd}::numeric),0)` })
      .from(offerwallConversionsTable)
      .where(eq(offerwallConversionsTable.provider, "adgem"));

    const [{ adsgramRevenue }] = await db
      .select({ adsgramRevenue: sql<number>`coalesce(sum(${adRewardsTable.revenue}::numeric),0)` })
      .from(adRewardsTable)
      .where(eq(adRewardsTable.provider, "adsgram"));

    const [{ cpxConversions }] = await db
      .select({ cpxConversions: sql<number>`count(*)::int` })
      .from(offerwallConversionsTable)
      .where(eq(offerwallConversionsTable.provider, "cpx_research"));

    const [{ adgemConversions }] = await db
      .select({ adgemConversions: sql<number>`count(*)::int` })
      .from(offerwallConversionsTable)
      .where(eq(offerwallConversionsTable.provider, "adgem"));

    const [{ fraudEvents }] = await db
      .select({ fraudEvents: sql<number>`count(*)::int` })
      .from(webhookLogsTable)
      .where(eq(webhookLogsTable.eventType, "fraud"));

    const [{ totalEarnings }] = await db
      .select({ totalEarnings: sql<number>`coalesce(sum(${transactionsTable.amount}::numeric),0)` })
      .from(transactionsTable)
      .where(eq(transactionsTable.direction, "credit"));

    const monetagRes = await db.execute(
      sql`select coalesce(sum(${adRewardsTable.revenue}::numeric),0) as v from ${adRewardsTable} where ${adRewardsTable.provider}='monetag'`
    );
    const lootablyRes = await db.execute(
      sql`select coalesce(sum(${offerwallConversionsTable.revenueUsd}::numeric),0) as v from ${offerwallConversionsTable} where provider='lootably'`
    );
    const toroxRes = await db.execute(
      sql`select coalesce(sum(${offerwallConversionsTable.revenueUsd}::numeric),0) as v from ${offerwallConversionsTable} where provider='torox'`
    );

    const todayRes = await db.execute(
      sql`select coalesce(sum(amount::numeric),0) as v from ${transactionsTable} where direction='credit' and created_at >= current_date`
    );
    const weekRes = await db.execute(
      sql`select coalesce(sum(amount::numeric),0) as v from ${transactionsTable} where direction='credit' and created_at >= date_trunc('week', current_date)`
    );
    const monthRes = await db.execute(
      sql`select coalesce(sum(amount::numeric),0) as v from ${transactionsTable} where direction='credit' and created_at >= date_trunc('month', current_date)`
    );

    const monetagRevenue = Number(monetagRes.rows?.[0]?.v ?? 0);
    const lootablyRevenue = Number(lootablyRes.rows?.[0]?.v ?? 0);
    const toroxRevenue = Number(toroxRes.rows?.[0]?.v ?? 0);
    const revenueToday = Number(todayRes.rows?.[0]?.v ?? 0);
    const revenueThisWeek = Number(weekRes.rows?.[0]?.v ?? 0);
    const revenueThisMonth = Number(monthRes.rows?.[0]?.v ?? 0);

    const topUsersRes = await db.execute(sql`
      select u.id, u.name, u.telegram_id as "telegramId",
             coalesce(w.total_earned::numeric, 0) as "rewardTotal",
             coalesce(w.total_earned::numeric, 0) as "revenueTotal"
      from ${usersTable} u
      left join ${walletsTable} w on w.user_id = u.id
      order by w.total_earned::numeric desc nulls last
      limit 10
    `);
    const topUsers = (topUsersRes.rows ?? []).map((r: any) => ({
      id: r.id,
      name: r.name,
      telegramId: r.telegramId,
      rewardTotal: Number(r.rewardTotal ?? 0),
      revenueTotal: Number(r.revenueTotal ?? 0),
    }));

    const dauSeries = await getDailySeries(sql`
      select to_char(day, 'YYYY-MM-DD') as day, count(distinct user_id)::int as value
      from (
        select date_trunc('day', created_at) as day, user_id from ${transactionsTable}
        where created_at >= now() - interval '14 days'
        union all
        select date_trunc('day', created_at) as day, user_id from ${offerwallConversionsTable}
        where created_at >= now() - interval '14 days'
      ) t
      group by day order by day asc
    `);

    const growthSeries = await getDailySeries(sql`
      select to_char(date_trunc('day', ${usersTable.createdAt}), 'YYYY-MM-DD') as day,
             count(*)::int as value
      from ${usersTable}
      where ${usersTable.createdAt} >= now() - interval '14 days'
      group by date_trunc('day', ${usersTable.createdAt})
      order by date_trunc('day', ${usersTable.createdAt}) asc
    `);

    const withdrawalSeries = await getDailySeries(sql`
      select to_char(date_trunc('day', ${withdrawalsTable.createdAt}), 'YYYY-MM-DD') as day,
             coalesce(sum(${withdrawalsTable.amount}::numeric), 0) as value
      from ${withdrawalsTable}
      where ${withdrawalsTable.createdAt} >= now() - interval '14 days'
      group by date_trunc('day', ${withdrawalsTable.createdAt})
      order by date_trunc('day', ${withdrawalsTable.createdAt}) asc
    `);

    const providerSeries = await getDailySeries(sql`
      select to_char(date_trunc('day', ${offerwallConversionsTable.createdAt}), 'YYYY-MM-DD') as day,
             coalesce(sum(${offerwallConversionsTable.revenueUsd}::numeric), 0) as value
      from ${offerwallConversionsTable}
      where ${offerwallConversionsTable.createdAt} >= now() - interval '14 days'
      group by date_trunc('day', ${offerwallConversionsTable.createdAt})
      order by date_trunc('day', ${offerwallConversionsTable.createdAt}) asc
    `);

    res.json({
      totalUsers: Number(totalUsers),
      activeUsers: Number(activeUsers),
      totalEarnings: Number(totalEarnings),
      totalWithdrawals: Number(totalWithdrawals),
      pendingWithdrawals: Number(pendingWithdrawals),
      revenueToday,
      revenueThisWeek,
      revenueThisMonth,
      cpxRevenue: Number(cpxRevenue),
      adgemRevenue: Number(adgemRevenue),
      adsgramRevenue: Number(adsgramRevenue),
      lootablyRevenue,
      toroxRevenue,
      monetagRevenue,
      cpxConversions: Number(cpxConversions),
      adgemConversions: Number(adgemConversions),
      fraudEvents: Number(fraudEvents),
      topUsers,
      estimatedNetRevenue:
        Number(cpxRevenue) + Number(adgemRevenue) + Number(adsgramRevenue) +
        monetagRevenue + lootablyRevenue + toroxRevenue,
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

/* ─── USERS ─────────────────────────────────── */

router.get("/users", async (req, res) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    let query = db.select().from(usersTable).orderBy(desc(usersTable.createdAt)).limit(200);
    if (q) {
      (query as any).where(
        or(
          ilike(usersTable.name, `%${q}%`),
          ilike(usersTable.username, `%${q}%`),
          ilike(usersTable.telegramId, `%${q}%`)
        )
      );
    }
    const users = await (q
      ? db.select().from(usersTable)
          .where(or(ilike(usersTable.name, `%${q}%`), ilike(usersTable.username, `%${q}%`), ilike(usersTable.telegramId, `%${q}%`)))
          .orderBy(desc(usersTable.createdAt)).limit(200)
      : db.select().from(usersTable).orderBy(desc(usersTable.createdAt)).limit(200));

    const result = await Promise.all(
      users.map(async (user) => {
        const wallet = await getWalletSnapshot(user.id).catch(() => null);
        return mapUserRow(user, wallet);
      })
    );
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.patch("/users/:id", async (req: any, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { isBanned, isAdmin, balanceAdjustment } = req.body;

    if (typeof isBanned === "boolean") {
      await db.update(usersTable).set({ isBanned, updatedAt: new Date() }).where(eq(usersTable.id, userId));
    }
    if (typeof isAdmin === "boolean") {
      await db.update(usersTable).set({ isAdmin, updatedAt: new Date() }).where(eq(usersTable.id, userId));
    }
    if (typeof balanceAdjustment === "number" && balanceAdjustment !== 0) {
      await adjustWalletByAdmin({
        userId,
        amount: balanceAdjustment,
        description: `Admin balance adjustment`,
        actorUserId: req.user?.userId,
      });
    }

    await logActivity({
      action: "admin_user_update",
      entityType: "users",
      entityId: userId,
      actorUserId: req.user?.userId,
      details: { isBanned, isAdmin, balanceAdjustment },
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ─── TRANSACTIONS ───────────────────────────── */

router.get("/transactions", async (_req, res) => {
  try {
    const txs = await db.execute(sql`
      select t.*, u.name as "userName"
      from ${transactionsTable} t
      left join ${usersTable} u on u.id = t.user_id
      order by t.created_at desc
      limit 200
    `);
    res.json(txs.rows ?? []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ─── WITHDRAWALS ────────────────────────────── */

router.get("/withdrawals", async (_req, res) => {
  try {
    const rows = await db.execute(sql`
      select w.*, u.name as "userName"
      from ${withdrawalsTable} w
      left join ${usersTable} u on u.id = w.user_id
      order by w.created_at desc
      limit 200
    `);
    res.json(rows.rows ?? []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.patch("/withdrawals/:id", async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const StatusSchema = z.object({ status: z.enum(["approved", "rejected"]) });
    const parsed = StatusSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid status" }); return; }

    const [withdrawal] = await db.select().from(withdrawalsTable).where(eq(withdrawalsTable.id, id)).limit(1);
    if (!withdrawal) { res.status(404).json({ error: "Not found" }); return; }
    if (withdrawal.status !== "pending") { res.status(400).json({ error: "Already processed" }); return; }

    const approved = parsed.data.status === "approved";
    await finalizeWithdrawal({
      userId: withdrawal.userId,
      amount: Number(withdrawal.amount),
      approved,
      description: approved ? "Withdrawal approved" : "Withdrawal rejected",
      source: "admin",
      referenceId: String(id),
    });

    await db.update(withdrawalsTable)
      .set({ status: parsed.data.status, processedAt: new Date(), updatedAt: new Date() })
      .where(eq(withdrawalsTable.id, id));

    await logActivity({
      action: approved ? "withdrawal_approved" : "withdrawal_rejected",
      entityType: "withdrawals",
      entityId: id,
      actorUserId: req.user?.userId,
      details: { amount: withdrawal.amount },
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ─── PROVIDERS ──────────────────────────────── */

router.get("/providers/adgem/conversions", async (_req, res) => {
  try {
    const rows = await db.execute(sql`
      select oc.*, u.name as "userName"
      from ${offerwallConversionsTable} oc
      left join ${usersTable} u on u.id = oc.user_id
      where oc.provider = 'adgem'
      order by oc.created_at desc limit 200
    `);
    res.json(rows.rows ?? []);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/providers/adgem/postbacks", async (_req, res) => {
  try {
    const rows = await db.select().from(webhookLogsTable)
      .where(eq(webhookLogsTable.provider, "adgem"))
      .orderBy(desc(webhookLogsTable.createdAt)).limit(100);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/providers/cpx_research/conversions", async (_req, res) => {
  try {
    const rows = await db.execute(sql`
      select oc.*, u.name as "userName"
      from ${offerwallConversionsTable} oc
      left join ${usersTable} u on u.id = oc.user_id
      where oc.provider = 'cpx_research'
      order by oc.created_at desc limit 200
    `);
    res.json(rows.rows ?? []);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/providers/adsgram/rewards", async (_req, res) => {
  try {
    const rows = await db.execute(sql`
      select ar.*, u.name as "userName"
      from ${adRewardsTable} ar
      left join ${usersTable} u on u.id = ar.user_id
      where ar.provider = 'adsgram'
      order by ar.created_at desc limit 200
    `);
    res.json(rows.rows ?? []);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/providers/lootably/conversions", async (_req, res) => {
  try {
    const rows = await db.execute(sql`
      select oc.*, u.name as "userName"
      from ${offerwallConversionsTable} oc
      left join ${usersTable} u on u.id = oc.user_id
      where oc.provider = 'lootably'
      order by oc.created_at desc limit 200
    `);
    res.json(rows.rows ?? []);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/providers/lootably/postbacks", async (_req, res) => {
  try {
    const rows = await db.select().from(webhookLogsTable)
      .where(eq(webhookLogsTable.provider, "lootably"))
      .orderBy(desc(webhookLogsTable.createdAt)).limit(100);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/providers/torox/conversions", async (_req, res) => {
  try {
    const rows = await db.execute(sql`
      select oc.*, u.name as "userName"
      from ${offerwallConversionsTable} oc
      left join ${usersTable} u on u.id = oc.user_id
      where oc.provider = 'torox'
      order by oc.created_at desc limit 200
    `);
    res.json(rows.rows ?? []);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/providers/torox/postbacks", async (_req, res) => {
  try {
    const rows = await db.select().from(webhookLogsTable)
      .where(eq(webhookLogsTable.provider, "torox"))
      .orderBy(desc(webhookLogsTable.createdAt)).limit(100);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/providers/monetag/rewards", async (_req, res) => {
  try {
    const rows = await db.execute(sql`
      select ar.*, u.name as "userName"
      from ${adRewardsTable} ar
      left join ${usersTable} u on u.id = ar.user_id
      where ar.provider = 'monetag'
      order by ar.created_at desc limit 200
    `);
    res.json(rows.rows ?? []);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

/* ─── TASKS ──────────────────────────────────── */

router.get("/tasks", async (_req, res) => {
  try {
    const rows = await db.select().from(tasksTable).orderBy(desc(tasksTable.createdAt));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/tasks", async (req: any, res) => {
  try {
    const Schema = z.object({
      title: z.string().min(1),
      description: z.string().default(""),
      reward: z.number().positive(),
      type: z.string().default("general"),
    });
    const parsed = Schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid data" }); return; }
    const [task] = await db.insert(tasksTable).values({
      title: parsed.data.title,
      description: parsed.data.description,
      reward: String(parsed.data.reward),
      type: parsed.data.type,
    }).returning();
    await logActivity({ action: "task_created", entityType: "tasks", entityId: task.id, actorUserId: req.user?.userId });
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/tasks/:id", async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(tasksTable).where(eq(tasksTable.id, id));
    await logActivity({ action: "task_deleted", entityType: "tasks", entityId: id, actorUserId: req.user?.userId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

/* ─── VIP LEVELS ─────────────────────────────── */

router.get("/vip-levels", async (_req, res) => {
  try {
    await ensureDefaultVipLevels();
    const rows = await db.select().from(vipLevelsTable).orderBy(vipLevelsTable.level);
    res.json(rows.map((v) => ({ ...v, benefits: JSON.parse(v.benefits || "[]") })));
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/vip-levels", async (req: any, res) => {
  try {
    const Schema = z.object({
      level: z.number().int().positive(),
      name: z.string().min(1),
      price: z.number().nonnegative().default(0),
      multiplier: z.number().positive().default(1),
      dailyLimit: z.number().int().nonnegative().default(0),
      benefits: z.array(z.string()).default([]),
    });
    const parsed = Schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid data" }); return; }
    const [vip] = await db.insert(vipLevelsTable).values({
      level: parsed.data.level,
      name: parsed.data.name,
      price: String(parsed.data.price),
      multiplier: String(parsed.data.multiplier),
      dailyLimit: parsed.data.dailyLimit,
      benefits: JSON.stringify(parsed.data.benefits),
    }).returning();
    res.json(vip);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.patch("/vip-levels/:id", async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const { price, multiplier, dailyLimit, benefits, isActive } = req.body;
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (price !== undefined) updates.price = String(price);
    if (multiplier !== undefined) updates.multiplier = String(multiplier);
    if (dailyLimit !== undefined) updates.dailyLimit = Number(dailyLimit);
    if (benefits !== undefined) updates.benefits = JSON.stringify(Array.isArray(benefits) ? benefits : []);
    if (isActive !== undefined) updates.isActive = Boolean(isActive);
    await db.update(vipLevelsTable).set(updates).where(eq(vipLevelsTable.id, id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

/* ─── ANNOUNCEMENTS ──────────────────────────── */

router.get("/announcements", async (_req, res) => {
  try {
    const rows = await db.select().from(announcementsTable).orderBy(desc(announcementsTable.createdAt)).limit(100);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/announcements", async (req: any, res) => {
  try {
    const Schema = z.object({
      title: z.string().min(1),
      body: z.string().min(1),
      audience: z.string().default("all"),
      locale: z.string().default("all"),
    });
    const parsed = Schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid data" }); return; }
    const [ann] = await db.insert(announcementsTable).values({
      title: parsed.data.title,
      body: parsed.data.body,
      audience: parsed.data.audience,
      locale: parsed.data.locale,
      createdBy: req.user?.userId ?? null,
    }).returning();
    res.json(ann);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

/* ─── LOGS ───────────────────────────────────── */

router.get("/logs/activity", async (_req, res) => {
  try {
    const rows = await db.select().from(activityLogsTable).orderBy(desc(activityLogsTable.createdAt)).limit(200);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/logs/fraud", async (_req, res) => {
  try {
    const rows = await db.select().from(webhookLogsTable)
      .where(eq(webhookLogsTable.eventType, "fraud"))
      .orderBy(desc(webhookLogsTable.createdAt)).limit(200);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

/* ─── SETTINGS ───────────────────────────────── */

router.get("/settings", async (req, res) => {
  try {
    const settings = await getAdminSettings();
    const base = getBaseUrl(req);
    res.json({
      ...settings,
      cpxResearchPostbackUrl: `${base}/api/cpx-research/postback`,
      adgemPostbackUrl: `${base}/api/adgem/postback`,
      adsgramRewardUrl: `${base}/api/adsgram/reward`,
      lootablyPostbackUrl: `${base}/api/lootably/postback`,
      toroxPostbackUrl: `${base}/api/torox/postback`,
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

const SettingsPatchSchema = z.object({
  brandingName: z.string().optional(),
  telegramBotToken: z.string().optional(),
  telegramMiniAppUrl: z.string().optional(),
  adgemPublisherId: z.string().optional(),
  adgemApiKey: z.string().optional(),
  adgemWallId: z.string().optional(),
  adgemPostbackSecret: z.string().optional(),
  cpxResearchAppId: z.string().optional(),
  cpxResearchSecretKey: z.string().optional(),
  adsgramBlockId: z.string().optional(),
  lootablyPlacementId: z.string().optional(),
  lootablySecretKey: z.string().optional(),
  lootablyRewardMultiplier: z.string().optional(),
  toroxAppId: z.string().optional(),
  toroxSecretKey: z.string().optional(),
  toroxRewardMultiplier: z.string().optional(),
  monetagZoneId: z.string().optional(),
  monetagRewardedReward: z.string().optional(),
  monetagRewardedRevenue: z.string().optional(),
  withdrawalMinimum: z.string().optional(),
  referralSignupReward: z.string().optional(),
  referralCommissionRate: z.string().optional(),
  adgemEnabled: z.boolean().optional(),
  taskAdgemEnabled: z.boolean().optional(),
  dailyBonusEnabled: z.boolean().optional(),
  referralTasksEnabled: z.boolean().optional(),
  cpxResearchEnabled: z.boolean().optional(),
  adsgramEnabled: z.boolean().optional(),
  lootablyEnabled: z.boolean().optional(),
  toroxEnabled: z.boolean().optional(),
  monetagEnabled: z.boolean().optional(),
  withdrawalsEnabled: z.boolean().optional(),
});

router.patch("/settings", async (req: any, res) => {
  try {
    const parsed = SettingsPatchSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid data", details: parsed.error.flatten() });
      return;
    }
    const data = parsed.data;
    const updates: Record<string, any> = { updatedAt: new Date() };

    const textFields = [
      "brandingName", "telegramBotToken", "telegramMiniAppUrl",
      "adgemPublisherId", "adgemApiKey", "adgemWallId", "adgemPostbackSecret",
      "cpxResearchAppId", "cpxResearchSecretKey", "adsgramBlockId",
      "lootablyPlacementId", "lootablySecretKey", "lootablyRewardMultiplier",
      "toroxAppId", "toroxSecretKey", "toroxRewardMultiplier",
      "monetagZoneId", "monetagRewardedReward", "monetagRewardedRevenue",
      "withdrawalMinimum", "referralSignupReward", "referralCommissionRate",
    ] as const;

    const boolFields = [
      "adgemEnabled", "taskAdgemEnabled", "dailyBonusEnabled", "referralTasksEnabled",
      "cpxResearchEnabled", "adsgramEnabled", "lootablyEnabled", "toroxEnabled",
      "monetagEnabled", "withdrawalsEnabled",
    ] as const;

    for (const key of textFields) {
      if (data[key] !== undefined) updates[key] = data[key];
    }
    for (const key of boolFields) {
      if (data[key] !== undefined) updates[key] = data[key];
    }

    const existing = await getAdminSettings();
    if (existing) {
      await db.update(adminSettingsTable).set(updates).where(eq(adminSettingsTable.id, existing.id));
    } else {
      await db.insert(adminSettingsTable).values(updates);
    }

    await logActivity({
      action: "settings_updated",
      entityType: "admin_settings",
      actorUserId: req.user?.userId,
      details: { updatedKeys: Object.keys(data) },
    });

    const newSettings = await getAdminSettings();
    const base = getBaseUrl(req);
    res.json({
      ...newSettings,
      cpxResearchPostbackUrl: `${base}/api/cpx-research/postback`,
      adgemPostbackUrl: `${base}/api/adgem/postback`,
      adsgramRewardUrl: `${base}/api/adsgram/reward`,
      lootablyPostbackUrl: `${base}/api/lootably/postback`,
      toroxPostbackUrl: `${base}/api/torox/postback`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ─── PLATFORMS (env-based) ──────────────────── */

const NEW_PLATFORMS = [
  { id: "clickadu",         label: "Clickadu",          envPrefix: "CLICKADU",          postbackPath: "/api/clickadu/postback" },
  { id: "monlix",           label: "Monlix",             envPrefix: "MONLIX",             postbackPath: "/api/monlix/postback" },
  { id: "gemiads",          label: "GemiAds",            envPrefix: "GEMIADS",            postbackPath: "/api/gemiads/postback" },
  { id: "earnwall",         label: "EarnWall",           envPrefix: "EARNWALL",           postbackPath: "/api/earnwall/postback" },
  { id: "pollmatic",        label: "Pollmatic",          envPrefix: "POLLMATIC",          postbackPath: "/api/pollmatic/postback" },
  { id: "rewards_offerwall",label: "Rewards Offerwall",  envPrefix: "REWARDS_OFFERWALL",  postbackPath: "/api/rewards-offerwall/postback" },
  { id: "offerwall_me",     label: "Offerwall.me",       envPrefix: "OFFERWALL_ME",       postbackPath: "/api/offerwall-me/postback" },
];

router.get("/platforms", async (req, res) => {
  try {
    const base = getBaseUrl(req);
    const platforms = await Promise.all(
      NEW_PLATFORMS.map(async (p) => {
        const enabled = process.env[`${p.envPrefix}_ENABLED`];
        const publisherId = process.env[`${p.envPrefix}_PUBLISHER_ID`];
        const apiKey = process.env[`${p.envPrefix}_API_KEY`];
        const secretKey = process.env[`${p.envPrefix}_SECRET_KEY`];

        const [convCount] = await db
          .select({ total: sql<number>`count(*)::int` })
          .from(offerwallConversionsTable)
          .where(eq(offerwallConversionsTable.provider, p.id))
          .catch(() => [{ total: 0 }]);

        const [revRow] = await db
          .select({ total: sql<number>`coalesce(sum(${offerwallConversionsTable.revenueUsd}::numeric),0)` })
          .from(offerwallConversionsTable)
          .where(eq(offerwallConversionsTable.provider, p.id))
          .catch(() => [{ total: 0 }]);

        const [postbackCount] = await db
          .select({ total: sql<number>`count(*)::int` })
          .from(webhookLogsTable)
          .where(eq(webhookLogsTable.provider, p.id))
          .catch(() => [{ total: 0 }]);

        return {
          id: p.id,
          label: p.label,
          enabled: enabled === "true" || enabled === "1",
          configured: Boolean(apiKey || publisherId),
          hasPublisherId: Boolean(publisherId),
          hasApiKey: Boolean(apiKey),
          hasSecretKey: Boolean(secretKey),
          postbackUrl: `${base}${p.postbackPath}`,
          conversions: Number(convCount?.total ?? 0),
          revenue: Number(revRow?.total ?? 0),
          postbackLogs: Number(postbackCount?.total ?? 0),
        };
      })
    );
    res.json(platforms);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

/* ─── OFFERWALL CONVERSIONS (generic by provider) ─ */

router.get("/providers/offerwall/conversions", async (req, res) => {
  try {
    const provider = typeof req.query.provider === "string" ? req.query.provider.trim() : "";
    const query = provider
      ? db.select().from(offerwallConversionsTable)
          .where(eq(offerwallConversionsTable.provider, provider))
          .orderBy(desc(offerwallConversionsTable.createdAt)).limit(200)
      : db.select().from(offerwallConversionsTable)
          .orderBy(desc(offerwallConversionsTable.createdAt)).limit(200);
    const rows = await query;
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/providers/offerwall/postbacks", async (req, res) => {
  try {
    const provider = typeof req.query.provider === "string" ? req.query.provider.trim() : "";
    const query = provider
      ? db.select().from(webhookLogsTable)
          .where(eq(webhookLogsTable.provider, provider))
          .orderBy(desc(webhookLogsTable.createdAt)).limit(200)
      : db.select().from(webhookLogsTable)
          .orderBy(desc(webhookLogsTable.createdAt)).limit(200);
    const rows = await query;
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

/* ─── ANALYTICS: NEW PLATFORM REVENUES ──────── */

router.get("/analytics/platforms", async (req, res) => {
  try {
    const base = getBaseUrl(req);
    const platformIds = NEW_PLATFORMS.map(p => p.id);
    const revenues: Record<string, number> = {};
    const conversions: Record<string, number> = {};

    await Promise.all(
      platformIds.map(async (pid) => {
        const [rev] = await db
          .select({ v: sql<number>`coalesce(sum(${offerwallConversionsTable.revenueUsd}::numeric),0)` })
          .from(offerwallConversionsTable)
          .where(eq(offerwallConversionsTable.provider, pid));
        const [cnt] = await db
          .select({ v: sql<number>`count(*)::int` })
          .from(offerwallConversionsTable)
          .where(eq(offerwallConversionsTable.provider, pid));
        revenues[pid] = Number(rev?.v ?? 0);
        conversions[pid] = Number(cnt?.v ?? 0);
      })
    );

    res.json({ revenues, conversions });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;

