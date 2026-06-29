/**
 * CPX Research – Postback / Callback handler.
 *
 * CPX Research parameters:
 *   - status           ("1" = completed, "2" = canceled)
 *   - trans_id         (unique transaction ID)
 *   - user_id          (your UserID)
 *   - amount_local     (reward amount in local currency)
 *   - amount_usd       (revenue in USD)
 *   - secure_hash      (MD5: md5(trans_id - secretKey))
 */

import { Router, type Request } from "express";
import crypto from "crypto";
import { db, offerwallConversionsTable, usersTable, webhookLogsTable } from "../db/index";
import { creditRewardWithVip, getAdminSettings, logActivity } from "../lib/finance";
import { requireAuth } from "../middleware/auth";
import { eq } from "drizzle-orm";
import { z } from "zod";


export const cpxResearchRouter = Router();

/**
 * CPX Research secure hash for frontend:
 *   secure_hash = MD5( MD5(user_id) + MD5(secret_key) )
 */
function computeCpxSecureHash(userId: string, secretKey: string): string {
  const md5User = crypto.createHash('md5').update(userId).digest('hex');
  const md5Key  = crypto.createHash('md5').update(secretKey).digest('hex');
  return crypto.createHash('md5').update(md5User + md5Key).digest('hex');
}

const CpxPostbackQuery = z.object({
  status: z.string().optional(),
  trans_id: z.string().min(1),
  user_id: z.string().min(1),
  amount_local: z.string().optional(),
  amount_usd: z.string().optional(),
  secure_hash: z.string().optional(),
  subid_1: z.string().optional(),
  subid_2: z.string().optional(),
  offer_id: z.string().optional(),
  type: z.string().optional(),
  ip_click: z.string().optional(),
});

/**
 * Verify CPX Research postback signature
 * Hash = MD5(trans_id - secretKey)
 */
function verifyCpxSignature(
  transId: string,
  hash: string,
  secretKey: string,
): boolean {
  if (!secretKey || !hash) return false;
  const data = `${transId}-${secretKey}`;
  const expected = crypto.createHash('md5').update(data).digest('hex');
  return expected === hash.toLowerCase();
}

function getRequestIp(req: any): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded) return forwarded.split(',')[0].trim();
  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp) return realIp;
  return '';
}

/**
 * GET /api/cpx-research/postback
 */
cpxResearchRouter.get('/postback', async (req, res) => {
  try {
    console.log('CPX postback received:', req.query);

    const parsed = CpxPostbackQuery.safeParse(req.query);
    if (!parsed.success) {
      console.log('CPX validation failed:', parsed.error);
      res.status(400).json({ error: 'Invalid parameters', details: parsed.error });
      return;
    }

    const { status, trans_id, user_id, amount_local, amount_usd, secure_hash, offer_id, type, subid_1, subid_2, ip_click } = parsed.data;

    // Status "2" = canceled/reversed
    if (status === '2') {
      const [existingConv] = await db.select().from(offerwallConversionsTable)
        .where(eq(offerwallConversionsTable.transactionId, trans_id))
        .limit(1);
      
      if (existingConv && existingConv.status === 'completed') {
        await db.update(offerwallConversionsTable)
          .set({ status: 'reversed', updatedAt: new Date() })
          .where(eq(offerwallConversionsTable.id, existingConv.id));
        
        await logActivity({
          action: 'cpx_research_reversed',
          entityType: 'offerwall_conversions',
          entityId: existingConv.id,
          userId: existingConv.userId,
          details: { provider: 'cpx_research', trans_id },
        });
      }

      res.status(200).json({ success: true, reversed: true });
      return;
    }

    // Only process completed (status=1)
    if (status && status !== '1') {
      res.status(200).json({ success: true, skipped: true, reason: `status=${status}` });
      return;
    }

    const settings = await getAdminSettings();
    if (!settings.cpxResearchEnabled) {
      res.status(403).json({ error: 'CPX Research is disabled' });
      return;
    }

    // Verify signature: md5(trans_id - secretKey)
    if (settings.cpxResearchSecretKey && secure_hash) {
      const isValid = verifyCpxSignature(trans_id, secure_hash, settings.cpxResearchSecretKey);
      if (!isValid) {
        await db.insert(webhookLogsTable).values({
          provider: 'cpx_research',
          eventType: 'postback',
          httpMethod: 'GET',
          status: 'invalid_signature',
          signatureValid: false,
          payload: JSON.stringify(req.query),
          ipAddress: getRequestIp(req),
          userAgent: (req.headers['user-agent'] as string) || '',
        });
        res.status(403).json({ error: 'Invalid signature' });
        return;
      }
    }

    const [user] = await db.select().from(usersTable)
      .where(eq(usersTable.telegramId, user_id))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Check duplicate
    const [existing] = await db.select().from(offerwallConversionsTable)
      .where(eq(offerwallConversionsTable.transactionId, trans_id))
      .limit(1);

    if (existing) {
      res.status(200).json({ success: true, duplicate: true });
      return;
    }

    const rewardAmount = parseFloat(amount_local || '0') || 0;
    const revenueUsd = parseFloat(amount_usd || '0') || rewardAmount;

    const credit = await creditRewardWithVip({
      userId: user.id,
      baseAmount: rewardAmount,
      rewardType: 'cpx_research_survey',
      description: `CPX Research survey completed`,
      source: 'cpx_research',
      referenceId: trans_id,
      metadata: { offerId: offer_id, revenueUsd, provider: 'cpx_research' },
    });

    await db.insert(offerwallConversionsTable).values({
      provider: 'cpx_research',
      conversionType: 'survey',
      userId: user.id,
      externalUserId: user_id,
      transactionId: trans_id,
      offerId: offer_id || null,
      title: `CPX Research Survey ${offer_id || ''}`,
      status: 'completed',
      rewardAmount: String(credit.totalCredited),
      revenueUsd: String(revenueUsd),
      multiplierApplied: String(credit.totalMultiplierApplied),
      sourceEvent: 'postback',
      ipAddress: getRequestIp(req),
      userAgent: (req.headers['user-agent'] as string) || '',
      rawPayload: JSON.stringify(req.query),
    });

    await logActivity({
      action: 'cpx_research_reward',
      entityType: 'offerwall_conversions',
      entityId: trans_id,
      userId: user.id,
      details: { provider: 'cpx_research', offerId: offer_id, reward: credit.totalCredited },
    });

    res.status(200).json({ success: true, credited: credit.totalCredited });
  } catch (err) {
    console.error('CPX Research postback error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/cpx-research/config
 */
cpxResearchRouter.get('/config', requireAuth, async (req: Request, res) => {
  try {
    const settings = await getAdminSettings();
    const { userId } = req.user!;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const secureHash = settings.cpxResearchSecretKey
      ? computeCpxSecureHash(user.telegramId, settings.cpxResearchSecretKey)
      : '';

    res.json({
      enabled: settings.cpxResearchEnabled,
      appId: settings.cpxResearchAppId,
      secureHash,
      telegramUserId: user.telegramId,
    });
  } catch (err) {
    console.error('CPX Research config error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default cpxResearchRouter;
