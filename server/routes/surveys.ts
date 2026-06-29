/**
 * Surveys route – powered by CPX Research.
 *
 * CPX Research secure hash formula:
 *   MD5( MD5(ext_user_id) + MD5(secret_key) )
 */

import { Router, type Request } from 'express';
import crypto from 'crypto';
import { desc, eq, sql } from 'drizzle-orm';
import { db, offerwallConversionsTable, usersTable } from '../db/index';
import { getAdminSettings } from '../lib/finance';
import { requireAuth } from '../middleware/auth';

const surveysRouter = Router();

function computeCpxSecureHash(extUserId: string, secretKey: string): string {
  const md5User = crypto.createHash('md5').update(extUserId).digest('hex');
  const md5Key  = crypto.createHash('md5').update(secretKey).digest('hex');
  return crypto.createHash('md5').update(md5User + md5Key).digest('hex');
}

/**
 * GET /api/surveys
 * Returns CPX Research offerwall config and user stats.
 */
surveysRouter.get('/', requireAuth, async (req: Request, res) => {
  const { userId } = req.user!;

  try {
    const settings = await getAdminSettings();

    if (!settings.cpxResearchEnabled || !settings.cpxResearchAppId) {
      res.json({ configured: false, maintenance: false });
      return;
    }

    const [user] = await db.select().from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const extUserId = user.telegramId;
    const secureHash = settings.cpxResearchSecretKey
      ? computeCpxSecureHash(extUserId, settings.cpxResearchSecretKey)
      : '';

    const params = new URLSearchParams();
    params.set('app_id', settings.cpxResearchAppId);
    params.set('ext_user_id', extUserId);
    if (secureHash) params.set('secure_hash', secureHash);

    const offerwallUrl = `https://offers.cpx-research.com/index.php?${params.toString()}`;

    const [stats] = await db.select({
      completedCount: sql<number>`count(*)::int`,
      totalReward:    sql<number>`coalesce(sum(${offerwallConversionsTable.rewardAmount}::numeric), 0)`,
      totalRevenue:   sql<number>`coalesce(sum(${offerwallConversionsTable.revenueUsd}::numeric), 0)`,
    })
    .from(offerwallConversionsTable)
    .where(eq(offerwallConversionsTable.userId, userId));

    const recentCompletions = await db.select()
      .from(offerwallConversionsTable)
      .where(eq(offerwallConversionsTable.userId, userId))
      .orderBy(desc(offerwallConversionsTable.createdAt))
      .limit(10);

    res.json({
      configured: true,
      provider:   'cpx_research',
      telegramUserId: extUserId,
      offerwallUrl,
      stats: {
        completedCount: Number(stats?.completedCount ?? 0),
        totalReward:    Number(stats?.totalReward    ?? 0),
        totalRevenue:   Number(stats?.totalRevenue   ?? 0),
      },
      recentCompletions: recentCompletions.map((c) => ({
        id:             c.id,
        title:          c.title || '',
        transactionId:  c.transactionId,
        conversionType: c.conversionType,
        reward:         Number(c.rewardAmount),
        status:         c.status,
        createdAt:      c.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error('Surveys (CPX Research) error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default surveysRouter;
