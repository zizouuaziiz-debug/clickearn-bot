import { Router } from "express";
import crypto from "crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { adRewardsTable, adUnitsTable, db } from "../db/index";
import { creditRewardWithVip, getAdminSettings, logActivity, roundMoney } from "../lib/finance";
import { requireAuth } from "../middleware/auth";
import { z } from "zod";

export const adsRouter = Router();

const StartSessionBody = z.object({
  adUnitId: z.number(),
});

const EventBody = z.object({
  sessionId: z.number().optional(),
  adUnitId: z.number(),
});

const CompleteSessionBody = z.object({
  sessionId: z.number(),
  verificationToken: z.string().min(8),
  completionProof: z.record(z.any()).optional(),
  revenue: z.number().min(0).optional(),
});

async function ensureDefaultAdUnits() {
  const settings = await getAdminSettings();
  const defaults = [
    { name: "Rewarded Ad", adType: "rewarded", unitKey: settings.tadsRewardedUnit || "tads_rewarded_default", placement: "ads_wall", reward: String(settings.rewardedAdReward) },
    { name: "Interstitial Ad", adType: "interstitial", unitKey: settings.tadsInterstitialUnit || "tads_interstitial_default", placement: "dashboard", reward: String(settings.interstitialAdReward) },
    { name: "Banner Ad", adType: "banner", unitKey: settings.tadsBannerUnit || "tads_banner_default", placement: "dashboard_footer", reward: String(settings.bannerAdReward) },
  ];

  for (const unit of defaults) {
    const [existing] = await db.select().from(adUnitsTable).where(and(eq(adUnitsTable.provider, "tads"), eq(adUnitsTable.adType, unit.adType))).limit(1);
    if (!existing) {
      await db.insert(adUnitsTable).values(unit);
    }
  }
}

function mapUnit(unit: typeof adUnitsTable.$inferSelect) {
  return {
    id: unit.id,
    name: unit.name,
    provider: unit.provider,
    adType: unit.adType,
    unitKey: unit.unitKey,
    placement: unit.placement,
    reward: Number(unit.reward),
    revenuePerView: Number(unit.revenuePerView),
    isActive: unit.isActive,
  };
}

adsRouter.get("/", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  try {
    await ensureDefaultAdUnits();
    const settings = await getAdminSettings();
    const units = await db.select().from(adUnitsTable).where(eq(adUnitsTable.isActive, true)).orderBy(adUnitsTable.id);
    const recentRewards = await db.select().from(adRewardsTable)
      .where(eq(adRewardsTable.userId, userId))
      .orderBy(desc(adRewardsTable.createdAt))
      .limit(10);

    const [stats] = await db.select({
      completedCount: sql<number>`count(*) filter (where ${adRewardsTable.status} = 'completed')::int`,
      totalRewards: sql<number>`coalesce(sum(case when ${adRewardsTable.status} = 'completed' then ${adRewardsTable.reward}::numeric else 0 end), 0)`,
    }).from(adRewardsTable).where(eq(adRewardsTable.userId, userId));

    res.json({
      enabled: settings.tadsEnabled,
      provider: "tads",
      appId: settings.tadsAppId,
      units: units.map(mapUnit),
      stats: {
        completedCount: Number(stats?.completedCount ?? 0),
        totalRewards: Number(stats?.totalRewards ?? 0),
      },
      recentRewards: recentRewards.map((item) => ({
        id: item.id,
        adType: item.adType,
        reward: Number(item.reward),
        status: item.status,
        createdAt: item.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error("Load ads error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

adsRouter.post("/session/start", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const parsed = StartSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  try {
    const settings = await getAdminSettings();
    if (!settings.tadsEnabled) {
      res.status(403).json({ error: "TADS is disabled" });
      return;
    }

    const [unit] = await db.select().from(adUnitsTable).where(eq(adUnitsTable.id, parsed.data.adUnitId)).limit(1);
    if (!unit || !unit.isActive) {
      res.status(404).json({ error: "Ad unit not found" });
      return;
    }

    const verificationToken = crypto.randomBytes(24).toString("hex");
    const [session] = await db.insert(adRewardsTable).values({
      userId,
      adUnitId: unit.id,
      provider: "tads",
      adType: unit.adType,
      status: "started",
      reward: "0",
      revenue: String(unit.revenuePerView),
      impressionCount: 0,
      clickCount: 0,
      verificationToken,
      metadata: JSON.stringify({ unitKey: unit.unitKey, placement: unit.placement }),
    }).returning();

    await logActivity({
      action: "ad_session_started",
      entityType: "ad_rewards",
      entityId: session.id,
      userId,
      details: { adUnitId: unit.id, adType: unit.adType },
    });

    res.status(201).json({
      sessionId: session.id,
      verificationToken,
      unit: mapUnit(unit),
      sdkConfig: {
        appId: settings.tadsAppId,
        unitKey: unit.unitKey,
        provider: "tads",
      },
    });
  } catch (err) {
    console.error("Start ad session error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

adsRouter.post("/impression", requireAuth, async (req, res) => {
  const parsed = EventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  try {
    if (parsed.data.sessionId) {
      await db.update(adRewardsTable).set({
        impressionCount: sql`${adRewardsTable.impressionCount} + 1`,
        updatedAt: new Date(),
      }).where(eq(adRewardsTable.id, parsed.data.sessionId));
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("Track impression error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

adsRouter.post("/click", requireAuth, async (req, res) => {
  const parsed = EventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  try {
    if (parsed.data.sessionId) {
      await db.update(adRewardsTable).set({
        clickCount: sql`${adRewardsTable.clickCount} + 1`,
        updatedAt: new Date(),
      }).where(eq(adRewardsTable.id, parsed.data.sessionId));
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("Track click error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

adsRouter.post("/session/complete", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const parsed = CompleteSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  try {
    const [session] = await db.select().from(adRewardsTable)
      .where(and(eq(adRewardsTable.id, parsed.data.sessionId), eq(adRewardsTable.userId, userId)))
      .limit(1);
    if (!session) {
      res.status(404).json({ error: "Ad session not found" });
      return;
    }

    if (session.status === "completed") {
      res.json({ ok: true, duplicate: true, reward: Number(session.reward) });
      return;
    }

    if (session.verificationToken !== parsed.data.verificationToken) {
      res.status(403).json({ error: "Invalid verification token" });
      return;
    }

    const [unit] = await db.select().from(adUnitsTable).where(eq(adUnitsTable.id, session.adUnitId)).limit(1);
    if (!unit || !unit.isActive) {
      res.status(404).json({ error: "Ad unit not available" });
      return;
    }

    const credit = await creditRewardWithVip({
      userId,
      baseAmount: Number(unit.reward),
      rewardType: "ad_reward",
      description: `${unit.provider.toUpperCase()} ${unit.adType} ad completed`,
      source: "tads",
      referenceId: String(session.id),
      metadata: {
        adUnitId: unit.id,
        adType: unit.adType,
        unitKey: unit.unitKey,
        completionProof: parsed.data.completionProof ?? {},
      },
    });

    const revenue = roundMoney(parsed.data.revenue ?? Number(unit.revenuePerView ?? 0));
    const [updated] = await db.update(adRewardsTable).set({
      status: "completed",
      reward: String(credit.totalCredited),
      revenue: String(revenue),
      completionProof: JSON.stringify(parsed.data.completionProof ?? {}),
      completedAt: new Date(),
      updatedAt: new Date(),
      impressionCount: session.impressionCount > 0 ? session.impressionCount : 1,
    }).where(eq(adRewardsTable.id, session.id)).returning();

    await logActivity({
      action: "ad_reward_credited",
      entityType: "ad_rewards",
      entityId: updated.id,
      userId,
      details: {
        adUnitId: unit.id,
        adType: unit.adType,
        reward: credit.totalCredited,
        vipBonus: credit.vipBonus,
        referralCommission: credit.referralCommission,
        revenue,
      },
    });

    res.json({
      ok: true,
      reward: credit.totalCredited,
      vipBonus: credit.vipBonus,
      adType: updated.adType,
    });
  } catch (err) {
    console.error("Complete ad session error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

adsRouter.post("/:adId/claim", requireAuth, async (req, res) => {
  res.status(410).json({ error: "Legacy ad claim endpoint is disabled. Use session/start and session/complete only." });
});
export default adsRouter;
