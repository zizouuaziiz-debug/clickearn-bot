import { and, eq, sql } from "drizzle-orm";
import {
  activityLogsTable,
  adminSettingsTable,
  db,
  offerwallConversionsTable,
  referralsTable,
  transactionsTable,
  usersTable,
  vipLevelsTable,
  walletsTable,
} from "../db/index";

export function roundMoney(value: number) {
  return Number((Number.isFinite(value) ? value : 0).toFixed(4));
}

export async function getAdminSettings(executor: any = db) {
  let [settings] = await executor.select().from(adminSettingsTable).limit(1);
  if (!settings) {
    [settings] = await executor.insert(adminSettingsTable).values({}).returning();
  }
  return settings;
}

export async function ensureWallet(userId: number, executor: any = db) {
  let [wallet] = await executor.select().from(walletsTable).where(eq(walletsTable.userId, userId)).limit(1);
  if (!wallet) {
    await executor.execute(sql`insert into wallets (user_id) values (${userId}) on conflict (user_id) do nothing`);
    [wallet] = await executor.select().from(walletsTable).where(eq(walletsTable.userId, userId)).limit(1);
  }
  return wallet;
}

export async function getWalletSnapshot(userId: number, executor: any = db) {
  const wallet = await ensureWallet(userId, executor);
  return {
    id: wallet.id,
    userId: wallet.userId,
    balance: Number(wallet.availableBalance),
    pendingBalance: Number(wallet.pendingBalance),
    totalEarned: Number(wallet.totalEarned),
    totalWithdrawn: Number(wallet.totalWithdrawn),
    raw: wallet,
  };
}

export async function syncUserWalletSnapshot(userId: number, executor: any = db) {
  const wallet = await ensureWallet(userId, executor);
  const [user] = await executor.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) return null;

  await executor.update(usersTable).set({
    balance: wallet.availableBalance,
    pendingBalance: wallet.pendingBalance,
    totalEarned: wallet.totalEarned,
    totalWithdrawn: wallet.totalWithdrawn,
    updatedAt: new Date(),
  }).where(eq(usersTable.id, userId));

  return wallet;
}

export async function logActivity(params: {
  action: string;
  entityType: string;
  entityId?: string | number | null;
  userId?: number | null;
  actorUserId?: number | null;
  details?: Record<string, unknown> | string | null;
  executor?: any;
}) {
  const executor = params.executor ?? db;
  await executor.insert(activityLogsTable).values({
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId == null ? null : String(params.entityId),
    userId: params.userId ?? null,
    actorUserId: params.actorUserId ?? null,
    details: typeof params.details === "string" ? params.details : JSON.stringify(params.details ?? {}),
  });
}

export async function ensureDefaultVipLevels() {
  const defaults = [
    { level: 1, name: "VIP 1", price: "25", multiplier: "1.10", dailyLimit: 10, benefits: JSON.stringify(["10% reward boost", "Priority ad queue", "Higher daily ad cap"]) },
    { level: 2, name: "VIP 2", price: "60", multiplier: "1.25", dailyLimit: 20, benefits: JSON.stringify(["25% reward boost", "Priority survey access", "Faster withdrawal review"]) },
    { level: 3, name: "VIP 3", price: "120", multiplier: "1.50", dailyLimit: 35, benefits: JSON.stringify(["50% reward boost", "Referral commission boost", "Exclusive campaigns"]) },
    { level: 4, name: "VIP 4", price: "250", multiplier: "1.80", dailyLimit: 50, benefits: JSON.stringify(["80% reward boost", "VIP-only placements", "Premium support"]) },
    { level: 5, name: "VIP 5", price: "500", multiplier: "2.20", dailyLimit: 75, benefits: JSON.stringify(["120% reward boost", "Highest daily limits", "Top payout priority"]) },
  ];

  for (const item of defaults) {
    const [existing] = await db.select().from(vipLevelsTable).where(eq(vipLevelsTable.level, item.level)).limit(1);
    if (!existing) {
      await db.insert(vipLevelsTable).values(item);
    }
  }
}

export async function getVipMultiplier(userId: number) {
  return getVipMultiplierWithExecutor(userId, db);
}

async function getVipMultiplierWithExecutor(userId: number, executor: any) {
  const [user] = await executor.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user || user.vipLevel <= 0) return 1;
  const [vip] = await executor.select().from(vipLevelsTable).where(and(eq(vipLevelsTable.level, user.vipLevel), eq(vipLevelsTable.isActive, true))).limit(1);
  return Number(vip?.multiplier ?? 1);
}

async function updateWalletBalancesInExecutor(executor: any, params: {
  userId: number;
  availableDelta?: number;
  pendingDelta?: number;
  earnedDelta?: number;
  withdrawnDelta?: number;
}) {
  await ensureWallet(params.userId, executor);
  const lockedResult = await executor.execute(sql`
    select id, user_id, available_balance, pending_balance, total_earned, total_withdrawn
    from wallets
    where user_id = ${params.userId}
    for update
  `);
  const wallet = lockedResult.rows?.[0] as {
    id: number;
    user_id: number;
    available_balance: string;
    pending_balance: string;
    total_earned: string;
    total_withdrawn: string;
  } | undefined;
  if (!wallet) {
    throw new Error("Wallet not found");
  }

  const nextAvailable = roundMoney(Number(wallet.available_balance) + (params.availableDelta ?? 0));
  const nextPending = roundMoney(Number(wallet.pending_balance) + (params.pendingDelta ?? 0));
  const nextEarned = roundMoney(Number(wallet.total_earned) + (params.earnedDelta ?? 0));
  const nextWithdrawn = roundMoney(Number(wallet.total_withdrawn) + (params.withdrawnDelta ?? 0));

  const [updated] = await executor.update(walletsTable).set({
    availableBalance: String(nextAvailable),
    pendingBalance: String(nextPending),
    totalEarned: String(nextEarned),
    totalWithdrawn: String(nextWithdrawn),
    updatedAt: new Date(),
  }).where(eq(walletsTable.userId, params.userId)).returning();

  await syncUserWalletSnapshot(params.userId, executor);
  return updated;
}

export async function adjustWalletByAdmin(params: {
  userId: number;
  amount: number;
  description: string;
  actorUserId?: number;
  executor?: any;
}) {
  const amount = roundMoney(params.amount);
  if (amount === 0) return;

  const run = async (executor: any) => {
    await updateWalletBalancesInExecutor(executor, {
      userId: params.userId,
      availableDelta: amount,
      earnedDelta: amount > 0 ? amount : 0,
    });

    await createTransaction({
      userId: params.userId,
      type: amount > 0 ? "manual_credit" : "manual_debit",
      category: "manual_adjustment",
      direction: amount > 0 ? "credit" : "debit",
      amount: Math.abs(amount),
      description: params.description,
      source: "admin",
      metadata: { actorUserId: params.actorUserId ?? null },
      executor,
    });

    await logActivity({
      action: "wallet_adjusted_by_admin",
      entityType: "wallets",
      userId: params.userId,
      actorUserId: params.actorUserId,
      details: { amount, description: params.description },
      executor,
    });
  };

  if (params.executor) {
    await run(params.executor);
    return;
  }
  await db.transaction(run);
}

export async function createTransaction(params: {
  userId: number;
  type: string;
  category: string;
  direction: "credit" | "debit";
  amount: number;
  status?: string;
  description: string;
  source?: string;
  referenceId?: string;
  metadata?: Record<string, unknown> | string | null;
  executor?: any;
}) {
  const executor = params.executor ?? db;
  const wallet = await ensureWallet(params.userId, executor);
  const [transaction] = await executor.insert(transactionsTable).values({
    userId: params.userId,
    walletId: wallet.id,
    type: params.type,
    category: params.category,
    direction: params.direction,
    amount: String(roundMoney(params.amount)),
    status: params.status ?? "completed",
    description: params.description,
    source: params.source ?? "system",
    referenceId: params.referenceId ?? null,
    metadata: typeof params.metadata === "string" ? params.metadata : JSON.stringify(params.metadata ?? {}),
  }).returning();
  return transaction;
}

async function creditReferralCommission(params: {
  userId: number;
  earnedAmount: number;
  source: string;
  description: string;
  referenceId?: string;
  executor: any;
}) {
  const [user] = await params.executor.select().from(usersTable).where(eq(usersTable.id, params.userId)).limit(1);
  if (!user?.referredBy || params.earnedAmount <= 0) return 0;

  const [referral] = await params.executor.select().from(referralsTable).where(eq(referralsTable.referredId, user.id)).limit(1);
  if (!referral) return 0;

  const commissionAmount = roundMoney(params.earnedAmount * Number(referral.commissionRate));
  if (commissionAmount <= 0) return 0;

  await updateWalletBalancesInExecutor(params.executor, {
    userId: referral.referrerId,
    availableDelta: commissionAmount,
    earnedDelta: commissionAmount,
  });

  await createTransaction({
    userId: referral.referrerId,
    type: "earn_referral_commission",
    category: "referral_reward",
    direction: "credit",
    amount: commissionAmount,
    description: `Referral commission from ${params.description}`,
    source: params.source,
    referenceId: params.referenceId,
    metadata: { referredUserId: user.id, earnedAmount: params.earnedAmount },
    executor: params.executor,
  });

  await params.executor.update(referralsTable).set({
    totalCommission: sql`${referralsTable.totalCommission} + ${String(commissionAmount)}`,
  }).where(eq(referralsTable.id, referral.id));

  await logActivity({
    action: "referral_commission_credited",
    entityType: "referrals",
    entityId: referral.id,
    userId: referral.referrerId,
    details: { referredUserId: user.id, commissionAmount, source: params.source },
    executor: params.executor,
  });

  return commissionAmount;
}

export async function creditRewardWithVip(params: {
  userId: number;
  baseAmount: number;
  rewardType: string;
  description: string;
  source: string;
  referenceId?: string;
  metadata?: Record<string, unknown>;
  applyReferralCommission?: boolean;
  sourceMultiplier?: number;
  transactionMode?: "split_vip" | "single_total";
  executor?: any;
}) {
  const originalBaseAmount = roundMoney(params.baseAmount);
  if (originalBaseAmount <= 0) {
    return {
      baseAmount: 0,
      vipBonus: 0,
      totalCredited: 0,
      referralCommission: 0,
      sourceMultiplier: 1,
      vipMultiplier: 1,
      effectiveBaseAmount: 0,
      totalMultiplierApplied: 1,
    };
  }

  const run = async (executor: any) => {
    const sourceMultiplier = roundMoney(params.sourceMultiplier ?? 1);
    const vipMultiplier = params.rewardType === "referral_reward" || params.rewardType === "vip_bonus"
      ? 1
      : await getVipMultiplierWithExecutor(params.userId, executor);
    const effectiveBaseAmount = roundMoney(originalBaseAmount * sourceMultiplier);
    const totalCredited = roundMoney(effectiveBaseAmount * vipMultiplier);
    const vipBonus = roundMoney(totalCredited - effectiveBaseAmount);

    await updateWalletBalancesInExecutor(executor, {
      userId: params.userId,
      availableDelta: totalCredited,
      earnedDelta: totalCredited,
    });

    const rewardTypeMap: Record<string, { type: string; category: string }> = {
      ad_reward: { type: "ad_reward", category: "ad_reward" },
      task_reward: { type: "task_reward", category: "task_reward" },
      daily_bonus: { type: "daily_bonus", category: "daily_bonus" },
      referral_reward: { type: "referral_reward", category: "referral_reward" },
      vip_bonus: { type: "vip_bonus", category: "vip_bonus" },
      manual_credit: { type: "manual_credit", category: "manual_adjustment" },
      bitlabs_survey: { type: "bitlabs_survey", category: "survey_reward" },
      bitlabs_offer: { type: "bitlabs_offer", category: "offer_reward" },
      adgem_offer: { type: "adgem_offer", category: "offer_reward" },
      adgem_game: { type: "adgem_game", category: "game_reward" },
      survey_reward: { type: "bitlabs_survey", category: "survey_reward" },
    };

    const rewardLedger = rewardTypeMap[params.rewardType] ?? { type: params.rewardType || "earn_bonus", category: params.rewardType || "bonus_reward" };

    if (params.transactionMode === "single_total") {
      await createTransaction({
        userId: params.userId,
        type: rewardLedger.type,
        category: rewardLedger.category,
        direction: "credit",
        amount: totalCredited,
        description: params.description,
        source: params.source,
        referenceId: params.referenceId,
        metadata: {
          ...(params.metadata ?? {}),
          sourceMultiplier,
          vipMultiplier,
          totalMultiplierApplied: roundMoney(sourceMultiplier * vipMultiplier),
          component: "total",
          originalBaseAmount,
        },
        executor,
      });
    } else {
      await createTransaction({
        userId: params.userId,
        type: rewardLedger.type,
        category: rewardLedger.category,
        direction: "credit",
        amount: effectiveBaseAmount,
        description: params.description,
        source: params.source,
        referenceId: params.referenceId,
        metadata: {
          ...(params.metadata ?? {}),
          sourceMultiplier,
          vipMultiplier,
          totalMultiplierApplied: roundMoney(sourceMultiplier * vipMultiplier),
          component: "base",
          originalBaseAmount,
        },
        executor,
      });

      if (vipBonus > 0) {
        await createTransaction({
          userId: params.userId,
          type: "earn_vip_bonus",
          category: "vip_bonus",
          direction: "credit",
          amount: vipBonus,
          description: `VIP bonus for ${params.description}`,
          source: params.source,
          referenceId: params.referenceId,
          metadata: {
            ...(params.metadata ?? {}),
            sourceMultiplier,
            vipMultiplier,
            totalMultiplierApplied: roundMoney(sourceMultiplier * vipMultiplier),
            component: "vip_bonus",
            originalBaseAmount,
          },
          executor,
        });
      }
    }

    const referralCommission = params.applyReferralCommission === false
      ? 0
      : await creditReferralCommission({
        userId: params.userId,
        earnedAmount: totalCredited,
        source: params.source,
        description: params.description,
        referenceId: params.referenceId,
        executor,
      });

    await logActivity({
      action: "wallet_credit",
      entityType: "transactions",
      entityId: params.referenceId ?? null,
      userId: params.userId,
      details: {
        originalBaseAmount,
        effectiveBaseAmount,
        vipBonus,
        totalCredited,
        sourceMultiplier,
        vipMultiplier,
        totalMultiplierApplied: roundMoney(sourceMultiplier * vipMultiplier),
        source: params.source,
        rewardType: params.rewardType,
      },
      executor,
    });

    return {
      baseAmount: originalBaseAmount,
      vipBonus,
      totalCredited,
      referralCommission,
      sourceMultiplier,
      vipMultiplier,
      effectiveBaseAmount,
      totalMultiplierApplied: roundMoney(sourceMultiplier * vipMultiplier),
    };
  };

  if (params.executor) {
    return run(params.executor);
  }
  return db.transaction(run);
}

export async function createWithdrawalHold(params: {
  userId: number;
  amount: number;
  description: string;
  source: string;
  referenceId?: string;
  metadata?: Record<string, unknown>;
  executor?: any;
}) {
  const amount = roundMoney(params.amount);
  const run = async (executor: any) => {
    await updateWalletBalancesInExecutor(executor, {
      userId: params.userId,
      availableDelta: -amount,
      pendingDelta: amount,
      withdrawnDelta: amount,
    });

    await createTransaction({
      userId: params.userId,
      type: "withdraw",
      category: "withdrawal",
      direction: "debit",
      amount,
      status: "pending",
      description: params.description,
      source: params.source,
      referenceId: params.referenceId,
      metadata: params.metadata,
      executor,
    });
  };

  if (params.executor) {
    await run(params.executor);
    return;
  }
  await db.transaction(run);
}

export async function finalizeWithdrawal(params: {
  userId: number;
  amount: number;
  approved: boolean;
  description: string;
  source: string;
  referenceId?: string;
  metadata?: Record<string, unknown>;
  executor?: any;
}) {
  const amount = roundMoney(params.amount);
  const run = async (executor: any) => {
    await updateWalletBalancesInExecutor(executor, {
      userId: params.userId,
      pendingDelta: -amount,
      withdrawnDelta: params.approved ? 0 : -amount,
      availableDelta: params.approved ? 0 : amount,
    });

    if (!params.approved) {
      await createTransaction({
        userId: params.userId,
        type: "withdrawal_reversal",
        category: "withdrawal",
        direction: "credit",
        amount,
        status: "completed",
        description: params.description,
        source: params.source,
        referenceId: params.referenceId,
        metadata: params.metadata,
        executor,
      });
    }
  };

  if (params.executor) {
    await run(params.executor);
    return;
  }
  await db.transaction(run);
}

export async function getRewardTotalsForUser(userId: number) {
  const wallet = await ensureWallet(userId);
  const [surveyStats] = await db.select({
    total: sql<number>`coalesce(sum(${offerwallConversionsTable.rewardAmount}::numeric), 0)`,
  }).from(offerwallConversionsTable).where(eq(offerwallConversionsTable.userId, userId));
  const [referralStats] = await db.select({
    total: sql<number>`coalesce(sum(${transactionsTable.amount}::numeric), 0)`,
  }).from(transactionsTable)
    .where(and(eq(transactionsTable.userId, userId), eq(transactionsTable.category, "referral_reward")));

  return {
    wallet,
    surveyRewards: Number(surveyStats?.total ?? 0),
    referralRewards: Number(referralStats?.total ?? 0),
  };
}
