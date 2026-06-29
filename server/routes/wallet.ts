import { Router } from "express";
import { desc, eq } from "drizzle-orm";
import { db, transactionsTable, usersTable, withdrawalsTable } from "../db/index";
import { createWithdrawalHold, getAdminSettings, getRewardTotalsForUser, getWalletSnapshot, logActivity } from "../lib/finance";
import { requireAuth } from "../middleware/auth";
import { z } from "zod";

const router = Router();
const WithdrawBody = z.object({
  amount: z.number().positive(),
  method: z.string().min(1),
  destination: z.string().optional().default(""),
});

router.get("/", requireAuth, async (req, res) => {
  const { userId } = req.user!;
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    const settings = await getAdminSettings();
    const rewardTotals = await getRewardTotalsForUser(userId);
    const walletSnapshot = await getWalletSnapshot(userId);
    if (!user) { res.status(404).json({ error: "Not found" }); return; }
    res.json({
      balance: walletSnapshot.balance,
      pendingBalance: walletSnapshot.pendingBalance,
      totalEarned: walletSnapshot.totalEarned,
      totalWithdrawn: walletSnapshot.totalWithdrawn,
      withdrawalMinimum: Number(settings.withdrawalMinimum),
      withdrawalsEnabled: settings.withdrawalsEnabled,
      tonWalletAddress: settings.tonWalletAddress,
      telegramStarsEnabled: settings.telegramStarsEnabled,
      surveyRewards: rewardTotals.surveyRewards,
      referralRewards: rewardTotals.referralRewards,
    });
  } catch (err) { console.error(err); res.status(500).json({ error: "Server error" }); }
});

router.get("/transactions", requireAuth, async (req, res) => {
  const { userId } = req.user!;
  try {
    const txns = await db.select().from(transactionsTable).where(eq(transactionsTable.userId, userId)).orderBy(desc(transactionsTable.createdAt)).limit(50);
    res.json(txns.map(t => ({
      id: t.id,
      type: t.type,
      category: t.category,
      direction: t.direction,
      amount: Number(t.amount),
      status: t.status,
      description: t.description,
      source: t.source,
      createdAt: t.createdAt.toISOString(),
    })));
  } catch (err) { console.error(err); res.status(500).json({ error: "Server error" }); }
});

router.post("/withdraw", requireAuth, async (req, res) => {
  const { userId } = req.user!;
  const parsed = WithdrawBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const { amount, method, destination } = parsed.data;
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    const walletSnapshot = await getWalletSnapshot(userId);
    const settings = await getAdminSettings();
    if (!user) { res.status(404).json({ error: "Not found" }); return; }
    if (!settings.withdrawalsEnabled) { res.status(400).json({ error: "Withdrawals are currently disabled" }); return; }
    if (amount < Number(settings.withdrawalMinimum)) {
      res.status(400).json({ error: `Minimum withdrawal is $${Number(settings.withdrawalMinimum).toFixed(2)}` });
      return;
    }
    if (walletSnapshot.balance < amount) { res.status(400).json({ error: "Insufficient balance" }); return; }

    const [withdrawal] = await db.insert(withdrawalsTable).values({
      userId,
      amount: String(amount),
      method,
      destination,
      status: "pending",
      updatedAt: new Date(),
    }).returning();

    await createWithdrawalHold({
      userId,
      amount,
      description: `Withdrawal request via ${method}`,
      source: "wallet",
      referenceId: String(withdrawal.id),
      metadata: { destination },
    });

    await logActivity({
      action: "withdrawal_requested",
      entityType: "withdrawals",
      entityId: withdrawal.id,
      userId,
      details: { amount, method, destination },
    });

    res.status(201).json({
      id: withdrawal.id,
      type: "withdraw",
      amount,
      status: withdrawal.status,
      description: `Withdrawal request via ${method}`,
      createdAt: withdrawal.createdAt.toISOString(),
    });
  } catch (err) { console.error(err); res.status(500).json({ error: "Server error" }); }
});

export default router;
