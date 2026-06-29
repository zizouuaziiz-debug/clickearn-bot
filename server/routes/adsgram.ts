/**
 * AdsGram – Rewarded ad server-side verification.
 *
 * AdsGram can optionally send a server-side GET request
 * to your reward URL after a user watches an ad.
 *
 * The reward URL pattern from AdsGram dashboard:
 *   https://yourdomain.com/api/adsgram/reward?userid=[userId]
 *
 * This endpoint handles both:
 * 1. Server-side reward confirmation from AdsGram
 * 2. Client-side reward completion (POST) with verification
 */

import { Router, type Request } from "express";
import crypto from "crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { adRewardsTable, adUnitsTable, db } from "../db/index";
import { creditRewardWithVip, getAdminSettings, logActivity, roundMoney } from "../lib/finance";
import { requireAuth } from "../middleware/auth";
import { z } from "zod";

export const adsgramRouter = Router();

const StartSessionBody = z.object({
  blockId: z.string().min(1),
});

const CompleteSessionBody = z.object({
  sessionId: z.number(),
  blockId: z.string().min(1),
  adResult: z.object({
    done: z.boolean(),
    description: z.string().optional(),
    state: z.string().optional(),
    error: z.boolean().optional(),
  }).optional(),
});

async function ensureAdsGramAdUnits() {
  const settings = await getAdminSettings();
  const defaults = [
    {
      name: 'AdsGram Rewarded Ad',
      provider: 'adsgram',
      adType: 'rewarded',
      unitKey: settings.adsgramBlockId || 'adsgram_default',
      placement: 'ads_wall',
      reward: String(settings.adsgramRewardedReward || '0.0050'),
      revenuePerView: String(settings.adsgramRewardedRevenue || '0.0100'),
    },
  ];

  for (const unit of defaults) {
    const [existing] = await db.select().from(adUnitsTable)
      .where(and(eq(adUnitsTable.provider, 'adsgram'), eq(adUnitsTable.adType, unit.adType)))
      .limit(1);
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

/**
 * GET /api/adsgram/config
 * Returns AdsGram configuration for the authenticated user.
 */
adsgramRouter.get('/config', requireAuth, async (req: Request, res) => {
  const { userId } = req.user!;
  try {
    await ensureAdsGramAdUnits();
    const settings = await getAdminSettings();
    const units = await db.select().from(adUnitsTable)
      .where(and(eq(adUnitsTable.provider, 'adsgram'), eq(adUnitsTable.isActive, true)))
      .orderBy(adUnitsTable.id);

    const recentRewards = await db.select().from(adRewardsTable)
      .where(and(eq(adRewardsTable.userId, userId), eq(adRewardsTable.provider, 'adsgram')))
      .orderBy(desc(adRewardsTable.createdAt))
      .limit(10);

    const [stats] = await db.select({
      completedCount: sql<number>`count(*) filter (where ${adRewardsTable.status} = 'completed')::int`,
      totalRewards: sql<number>`coalesce(sum(case when ${adRewardsTable.status} = 'completed' then ${adRewardsTable.reward}::numeric else 0 end), 0)`,
    }).from(adRewardsTable)
      .where(and(eq(adRewardsTable.userId, userId), eq(adRewardsTable.provider, 'adsgram')));

    res.json({
      enabled: settings.adsgramEnabled,
      provider: 'adsgram',
      blockId: settings.adsgramBlockId,
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
    console.error('AdsGram config error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/adsgram/session/start
 * Start an AdsGram ad session.
 */
adsgramRouter.post('/session/start', requireAuth, async (req: Request, res) => {
  const { userId } = req.user!;
  const parsed = StartSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input' });
    return;
  }

  try {
    const settings = await getAdminSettings();
    if (!settings.adsgramEnabled) {
      res.status(403).json({ error: 'AdsGram is disabled' });
      return;
    }

    await ensureAdsGramAdUnits();

    const [unit] = await db.select().from(adUnitsTable)
      .where(and(eq(adUnitsTable.provider, 'adsgram'), eq(adUnitsTable.adType, 'rewarded'), eq(adUnitsTable.isActive, true)))
      .limit(1);

    if (!unit) {
      res.status(404).json({ error: 'AdsGram ad unit not found' });
      return;
    }

    const verificationToken = crypto.randomBytes(24).toString('hex');
    const [session] = await db.insert(adRewardsTable).values({
      userId,
      adUnitId: unit.id,
      provider: 'adsgram',
      adType: 'rewarded',
      status: 'started',
      reward: '0',
      revenue: String(unit.revenuePerView),
      impressionCount: 0,
      clickCount: 0,
      verificationToken,
      metadata: JSON.stringify({ blockId: parsed.data.blockId, unitKey: unit.unitKey }),
    }).returning();

    await logActivity({
      action: 'adsgram_session_started',
      entityType: 'ad_rewards',
      entityId: session.id,
      userId,
      details: { adUnitId: unit.id, blockId: parsed.data.blockId },
    });

    res.status(201).json({
      sessionId: session.id,
      verificationToken,
      unit: mapUnit(unit),
      blockId: settings.adsgramBlockId,
    });
  } catch (err) {
    console.error('AdsGram start session error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/adsgram/session/complete
 * Complete an AdsGram ad session and credit rewards.
 */
adsgramRouter.post('/session/complete', requireAuth, async (req: Request, res) => {
  const { userId } = req.user!;
  const parsed = CompleteSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input' });
    return;
  }

  try {
    const [session] = await db.select().from(adRewardsTable)
      .where(and(eq(adRewardsTable.id, parsed.data.sessionId), eq(adRewardsTable.userId, userId)))
      .limit(1);
    if (!session) {
      res.status(404).json({ error: 'Ad session not found' });
      return;
    }

    if (session.status === 'completed') {
      res.json({ ok: true, duplicate: true, reward: Number(session.reward) });
      return;
    }

    // AdsGram verifies rewards client-side via the AdController.show() promise.
    // The `done` field from the result indicates a completed view.
    if (!parsed.data.adResult?.done) {
      // Mark as skipped
      await db.update(adRewardsTable).set({
        status: 'skipped',
        updatedAt: new Date(),
        completionProof: JSON.stringify(parsed.data.adResult ?? {}),
      }).where(eq(adRewardsTable.id, session.id));

      res.json({ ok: true, skipped: true });
      return;
    }

    const [unit] = await db.select().from(adUnitsTable)
      .where(eq(adUnitsTable.id, session.adUnitId))
      .limit(1);
    if (!unit || !unit.isActive) {
      res.status(404).json({ error: 'Ad unit not available' });
      return;
    }

    const credit = await creditRewardWithVip({
      userId,
      baseAmount: Number(unit.reward),
      rewardType: 'ad_reward',
      description: `AdsGram rewarded ad completed`,
      source: 'adsgram',
      referenceId: String(session.id),
      metadata: {
        adUnitId: unit.id,
        adType: unit.adType,
        unitKey: unit.unitKey,
        blockId: parsed.data.blockId,
        adResult: parsed.data.adResult ?? {},
      },
    });

    const revenue = roundMoney(Number(unit.revenuePerView ?? 0));
    const [updated] = await db.update(adRewardsTable).set({
      status: 'completed',
      reward: String(credit.totalCredited),
      revenue: String(revenue),
      completionProof: JSON.stringify(parsed.data.adResult ?? {}),
      completedAt: new Date(),
      updatedAt: new Date(),
      impressionCount: session.impressionCount > 0 ? session.impressionCount : 1,
    }).where(eq(adRewardsTable.id, session.id)).returning();

    await logActivity({
      action: 'adsgram_reward_credited',
      entityType: 'ad_rewards',
      entityId: updated.id,
      userId,
      details: {
        adUnitId: unit.id,
        adType: unit.adType,
        reward: credit.totalCredited,
        vipBonus: credit.vipBonus,
        revenue,
        blockId: parsed.data.blockId,
      },
    });

    res.json({
      ok: true,
      reward: credit.totalCredited,
      vipBonus: credit.vipBonus,
      adType: updated.adType,
    });
  } catch (err) {
    console.error('AdsGram complete session error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/adsgram/reward?userid=[userId]
 * Server-side reward callback from AdsGram.
 * AdsGram sends a GET request to this URL after the user is rewarded on client side.
 */
adsgramRouter.get('/reward', async (req, res) => {
  try {
    const { userid } = req.query;
    if (!userid || typeof userid !== 'string') {
      res.status(400).json({ error: 'Missing userid parameter' });
      return;
    }

    const settings = await getAdminSettings();
    if (!settings.adsgramEnabled) {
      res.status(403).json({ error: 'AdsGram is disabled' });
      return;
    }

    const { usersTable: ut } = await import('../db/index');
    const [user] = await db.select().from(ut)
      .where(eq(ut.telegramId, userid))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // This is a secondary verification – the primary reward was already
    // credited via the client-side session/complete flow.
    // Here we just acknowledge the server-side callback.
    await logActivity({
      action: 'adsgram_server_callback',
      entityType: 'ad_rewards',
      userId: user.id,
      details: { telegramId: userid, query: req.query },
    });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('AdsGram reward callback error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default adsgramRouter;
