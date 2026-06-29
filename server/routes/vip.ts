import { Router } from "express";
import { desc, eq, lte } from "drizzle-orm";
import { db, depositsTable, usersTable, vipLevelsTable } from "../db/index";
import { ensureDefaultVipLevels, logActivity } from "../lib/finance";
import { requireAuth } from "../middleware/auth";
import { z } from "zod";

const router = Router();
const DepositBody = z.object({
  level: z.number().min(1).max(5).optional(),
  amount: z.number().positive().optional(),
  method: z.string().min(1),
});

router.get("/levels", async (_req, res) => {
  try {
    await ensureDefaultVipLevels();
    const rows = await db.select().from(vipLevelsTable).orderBy(vipLevelsTable.level);
    res.json(rows.map((item) => ({
      id: item.id,
      level: item.level,
      name: item.name,
      requiredDeposit: Number(item.price),
      earningsMultiplier: Number(item.multiplier),
      dailyLimit: item.dailyLimit,
      benefits: JSON.parse(item.benefits || "[]"),
      isActive: item.isActive,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/deposit", requireAuth, async (req, res) => {
  const { userId } = req.user!;
  const parsed = DepositBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const { amount, level, method } = parsed.data;
  try {
    await ensureDefaultVipLevels();
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) { res.status(404).json({ error: "Not found" }); return; }
    const targetLevel = level != null
      ? (await db.select().from(vipLevelsTable).where(eq(vipLevelsTable.level, level)).limit(1))[0]
      : (await db.select().from(vipLevelsTable).where(lte(vipLevelsTable.price, String(amount ?? 0))).orderBy(desc(vipLevelsTable.level)).limit(1))[0];

    if (!targetLevel || !targetLevel.isActive) {
      res.status(400).json({ error: "Selected VIP level is unavailable" });
      return;
    }

    const payableAmount = amount ?? Number(targetLevel.price);
    const nextVipLevel = Math.max(user.vipLevel, targetLevel.level);

    const [deposit] = await db.insert(depositsTable).values({
      userId,
      vipLevel: targetLevel.level,
      amount: String(payableAmount),
      method,
      status: "completed",
      notes: `VIP ${targetLevel.level} purchase`,
      processedAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    await db.update(usersTable).set({
      vipLevel: nextVipLevel,
      updatedAt: new Date(),
    }).where(eq(usersTable.id, userId));

    await logActivity({
      action: "vip_upgraded",
      entityType: "vip_levels",
      entityId: targetLevel.id,
      userId,
      details: { fromLevel: user.vipLevel, toLevel: nextVipLevel, amount: payableAmount, method },
    });

    res.status(201).json({
      id: deposit.id,
      type: "deposit_vip",
      amount: payableAmount,
      status: deposit.status,
      description: `VIP ${targetLevel.level} activated via ${method}`,
      createdAt: deposit.createdAt.toISOString(),
      vipLevel: nextVipLevel,
    });
  } catch (err) { console.error(err); res.status(500).json({ error: "Server error" }); }
});

export default router;
