import { Router } from "express";
import { db, taskCompletionsTable, tasksTable } from "../db/index";
import { eq, and, gte } from "drizzle-orm";
import { creditRewardWithVip, getAdminSettings, getVipMultiplier, getWalletSnapshot, logActivity } from "../lib/finance";
import { requireAuth } from "../middleware/auth";
import { transactionsTable } from "../db/index";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  try {
    const settings = await getAdminSettings();
    const multiplier = await getVipMultiplier(userId);
    const allTasks = await db.select().from(tasksTable).where(eq(tasksTable.isActive, true));
    const completions = await db.select().from(taskCompletionsTable).where(eq(taskCompletionsTable.userId, userId));
    const completedIds = new Set(completions.map(c => c.taskId));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dailyBonusTransactions = await db.select().from(transactionsTable)
      .where(and(
        eq(transactionsTable.userId, userId),
        eq(transactionsTable.type, "daily_bonus"),
        gte(transactionsTable.createdAt, today),
      ))
      .limit(1);

    res.json({
      providerStatus: {
        bitlabsEnabled: settings.taskBitlabsEnabled && settings.bitlabsEnabled && !settings.bitlabsMaintenanceMode,
        adgemEnabled: settings.taskAdgemEnabled && settings.adgemEnabled,
        dailyBonusEnabled: settings.dailyBonusEnabled,
        referralTasksEnabled: settings.referralTasksEnabled,
      },
      categories: [
        { id: "bitlabs-surveys", title: "BitLabs Surveys", type: "provider", provider: "bitlabs", route: "/surveys?mode=surveys", enabled: settings.taskBitlabsEnabled && settings.bitlabsEnabled && !settings.bitlabsMaintenanceMode },
        { id: "bitlabs-offers", title: "BitLabs Offers", type: "provider", provider: "bitlabs", route: "/surveys?mode=offers", enabled: settings.taskBitlabsEnabled && settings.bitlabsEnabled && !settings.bitlabsMaintenanceMode },
        { id: "adgem-offers", title: "AdGem Offers", type: "provider", provider: "adgem", route: "/offers?view=offers", enabled: settings.taskAdgemEnabled && settings.adgemEnabled },
        { id: "adgem-games", title: "AdGem Games", type: "provider", provider: "adgem", route: "/offers?view=games", enabled: settings.taskAdgemEnabled && settings.adgemEnabled },
        { id: "daily-bonus", title: "Daily Bonus", type: "daily_bonus", provider: "internal", route: "/tasks", enabled: settings.dailyBonusEnabled, claimed: dailyBonusTransactions.length > 0, reward: Number(settings.rewardedAdReward ?? 0.05) },
        { id: "referral-tasks", title: "Referral Tasks", type: "referral", provider: "internal", route: "/referral", enabled: settings.referralTasksEnabled },
      ],
      customTasks: allTasks.map(t => ({ id: t.id, title: t.title, description: t.description, reward: Number(t.reward) * multiplier, type: t.type, isCompleted: completedIds.has(t.id), expiresAt: t.expiresAt ? t.expiresAt.toISOString() : null })),
    });
  } catch (err) { console.error(err); res.status(500).json({ error: "Server error" }); }
});

router.post("/:taskId/complete", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const taskId = Number(req.params.taskId);
  if (isNaN(taskId)) { res.status(400).json({ error: "Invalid task ID" }); return; }
  try {
    const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, taskId)).limit(1);
    if (!task || !task.isActive) { res.status(404).json({ error: "Task not found" }); return; }
    const [existing] = await db.select().from(taskCompletionsTable).where(and(eq(taskCompletionsTable.userId, userId), eq(taskCompletionsTable.taskId, taskId))).limit(1);
    if (existing) { res.status(400).json({ error: "Task already completed" }); return; }
    await db.insert(taskCompletionsTable).values({ userId, taskId });

    const credit = await creditRewardWithVip({
      userId,
      baseAmount: Number(task.reward),
      rewardType: "task_reward",
      description: `Completed task: ${task.title}`,
      source: "tasks",
      referenceId: String(task.id),
      metadata: { taskId: task.id, taskType: task.type },
    });

    await logActivity({
      action: "task_completed",
      entityType: "tasks",
      entityId: task.id,
      userId,
      details: { reward: credit.totalCredited, vipBonus: credit.vipBonus },
    });

    const walletSnapshot = await getWalletSnapshot(userId);
    res.json({ success: true, reward: credit.totalCredited, newBalance: walletSnapshot.balance });
  } catch (err) { console.error(err); res.status(500).json({ error: "Server error" }); }
});

router.post("/daily-bonus/claim", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  try {
    const settings = await getAdminSettings();
    if (!settings.dailyBonusEnabled) {
      res.status(403).json({ error: "Daily bonus disabled" });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [existing] = await db.select().from(transactionsTable)
      .where(and(
        eq(transactionsTable.userId, userId),
        eq(transactionsTable.type, "daily_bonus"),
        gte(transactionsTable.createdAt, today),
      ))
      .limit(1);

    if (existing) {
      res.status(400).json({ error: "Daily bonus already claimed" });
      return;
    }

    const credit = await creditRewardWithVip({
      userId,
      baseAmount: Number(settings.rewardedAdReward ?? 0.05),
      rewardType: "daily_bonus",
      description: "Daily bonus reward",
      source: "daily_bonus",
      referenceId: `${userId}-${today.toISOString().slice(0, 10)}`,
      transactionMode: "single_total",
    });

    await logActivity({
      action: "daily_bonus_claimed",
      entityType: "transactions",
      entityId: `${userId}-${today.toISOString().slice(0, 10)}`,
      userId,
      details: { reward: credit.totalCredited },
    });

    const walletSnapshot = await getWalletSnapshot(userId);
    res.json({ success: true, reward: credit.totalCredited, newBalance: walletSnapshot.balance });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
