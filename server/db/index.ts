import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { boolean, integer, numeric, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

const connectionString = process.env.DATABASE_URL;

export const pool = new Pool({
  connectionString,
  ssl: connectionString?.includes("localhost") ? false : { rejectUnauthorized: false },
});

export const db = drizzle(pool);

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  telegramId: text("telegram_id").notNull().unique(),
  username: text("username"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  name: text("name").notNull(),
  profilePhoto: text("profile_photo"),
  languageCode: text("language_code"),
  referralCode: varchar("referral_code", { length: 20 }).notNull().unique(),
  referredBy: integer("referred_by"),
  vipLevel: integer("vip_level").notNull().default(0),
  balance: numeric("balance", { precision: 12, scale: 4 }).notNull().default("0"),
  pendingBalance: numeric("pending_balance", { precision: 12, scale: 4 }).notNull().default("0"),
  totalEarned: numeric("total_earned", { precision: 12, scale: 4 }).notNull().default("0"),
  totalWithdrawn: numeric("total_withdrawn", { precision: 12, scale: 4 }).notNull().default("0"),
  isAdmin: boolean("is_admin").notNull().default(false),
  isBanned: boolean("is_banned").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const walletsTable = pgTable("wallets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  availableBalance: numeric("available_balance", { precision: 12, scale: 4 }).notNull().default("0"),
  pendingBalance: numeric("pending_balance", { precision: 12, scale: 4 }).notNull().default("0"),
  totalEarned: numeric("total_earned", { precision: 12, scale: 4 }).notNull().default("0"),
  totalWithdrawn: numeric("total_withdrawn", { precision: 12, scale: 4 }).notNull().default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  walletId: integer("wallet_id"),
  type: varchar("type", { length: 60 }).notNull(),
  category: varchar("category", { length: 40 }).notNull(),
  direction: varchar("direction", { length: 10 }).notNull(),
  amount: numeric("amount", { precision: 12, scale: 4 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("completed"),
  description: text("description").notNull(),
  source: varchar("source", { length: 40 }).notNull().default("system"),
  referenceId: text("reference_id"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const tasksTable = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  reward: numeric("reward", { precision: 12, scale: 4 }).notNull(),
  type: varchar("type", { length: 30 }).notNull().default("general"),
  isActive: boolean("is_active").notNull().default(true),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const taskCompletionsTable = pgTable("task_completions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  taskId: integer("task_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const offersTable = pgTable("offers", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  reward: numeric("reward", { precision: 12, scale: 4 }).notNull(),
  imageUrl: text("image_url").notNull(),
  ctaLabel: text("cta_label").notNull(),
  ctaUrl: text("cta_url").notNull(),
  category: varchar("category", { length: 50 }).notNull().default("general"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const adUnitsTable = pgTable("ad_units", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  provider: varchar("provider", { length: 20 }).notNull().default("tads"),
  adType: varchar("ad_type", { length: 20 }).notNull(),
  unitKey: text("unit_key").notNull(),
  placement: text("placement").notNull().default("ads_wall"),
  reward: numeric("reward", { precision: 12, scale: 4 }).notNull().default("0"),
  revenuePerView: numeric("revenue_per_view", { precision: 12, scale: 4 }).notNull().default("0"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const adRewardsTable = pgTable("ad_rewards", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  adUnitId: integer("ad_unit_id").notNull(),
  provider: varchar("provider", { length: 20 }).notNull().default("tads"),
  adType: varchar("ad_type", { length: 20 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("started"),
  reward: numeric("reward", { precision: 12, scale: 4 }).notNull().default("0"),
  revenue: numeric("revenue", { precision: 12, scale: 4 }).notNull().default("0"),
  impressionCount: integer("impression_count").notNull().default(0),
  clickCount: integer("click_count").notNull().default(0),
  verificationToken: text("verification_token"),
  completionProof: text("completion_proof"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const referralsTable = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrerId: integer("referrer_id").notNull(),
  referredId: integer("referred_id").notNull().unique(),
  referralCode: varchar("referral_code", { length: 20 }).notNull(),
  signupReward: numeric("signup_reward", { precision: 12, scale: 4 }).notNull().default("0"),
  commissionRate: numeric("commission_rate", { precision: 7, scale: 4 }).notNull().default("0"),
  totalCommission: numeric("total_commission", { precision: 12, scale: 4 }).notNull().default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const vipLevelsTable = pgTable("vip_levels", {
  id: serial("id").primaryKey(),
  level: integer("level").notNull().unique(),
  name: text("name").notNull(),
  price: numeric("price", { precision: 12, scale: 4 }).notNull().default("0"),
  benefits: text("benefits").notNull().default("[]"),
  multiplier: numeric("multiplier", { precision: 8, scale: 4 }).notNull().default("1"),
  dailyLimit: integer("daily_limit").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const offerwallConversionsTable = pgTable("offerwall_conversions", {
  id: serial("id").primaryKey(),
  provider: varchar("provider", { length: 20 }).notNull(),
  conversionType: varchar("conversion_type", { length: 30 }).notNull().default("offer"),
  userId: integer("user_id").notNull(),
  externalUserId: text("external_user_id").notNull(),
  transactionId: text("transaction_id").notNull().unique(),
  offerId: text("offer_id"),
  taskId: text("task_id"),
  goalId: text("goal_id"),
  title: text("title"),
  status: varchar("status", { length: 20 }).notNull().default("completed"),
  rewardAmount: numeric("reward_amount", { precision: 12, scale: 4 }).notNull().default("0"),
  revenueUsd: numeric("revenue_usd", { precision: 12, scale: 4 }).notNull().default("0"),
  multiplierApplied: numeric("multiplier_applied", { precision: 8, scale: 4 }).notNull().default("1"),
  sourceEvent: text("source_event"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  rawPayload: text("raw_payload"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const withdrawalsTable = pgTable("withdrawals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  amount: numeric("amount", { precision: 12, scale: 4 }).notNull(),
  method: text("method").notNull(),
  destination: text("destination").notNull().default(""),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  processedAt: timestamp("processed_at"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const depositsTable = pgTable("deposits", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  vipLevel: integer("vip_level").notNull().default(0),
  amount: numeric("amount", { precision: 12, scale: 4 }).notNull(),
  method: text("method").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  processedAt: timestamp("processed_at"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const webhookLogsTable = pgTable("webhook_logs", {
  id: serial("id").primaryKey(),
  provider: varchar("provider", { length: 20 }).notNull(),
  eventType: varchar("event_type", { length: 30 }).notNull().default("callback"),
  httpMethod: varchar("http_method", { length: 10 }).notNull(),
  status: varchar("status", { length: 30 }).notNull(),
  signatureValid: boolean("signature_valid").notNull().default(false),
  userId: integer("user_id"),
  referenceId: text("reference_id"),
  payload: text("payload").notNull(),
  responseBody: text("response_body"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const announcementsTable = pgTable("announcements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  audience: varchar("audience", { length: 30 }).notNull().default("all"),
  locale: varchar("locale", { length: 10 }).notNull().default("all"),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const adminSettingsTable = pgTable("admin_settings", {
  id: serial("id").primaryKey(),
  telegramBotToken: text("telegram_bot_token").notNull().default(""),
  telegramBotUsername: text("telegram_bot_username").notNull().default(""),
  telegramMiniAppUrl: text("telegram_mini_app_url").notNull().default(""),
  telegramStarsEnabled: boolean("telegram_stars_enabled").notNull().default(false),
  tonWalletAddress: text("ton_wallet_address").notNull().default(""),
  brandingName: text("branding_name").notNull().default("ClickEarn"),
  brandingLogoUrl: text("branding_logo_url").notNull().default(""),
  defaultLocale: varchar("default_locale", { length: 10 }).notNull().default("en"),
  bitlabsEnabled: boolean("bitlabs_enabled").notNull().default(false),
  bitlabsMaintenanceMode: boolean("bitlabs_maintenance_mode").notNull().default(false),
  bitlabsApiKey: text("bitlabs_api_key").notNull().default(""),
  bitlabsAppId: text("bitlabs_app_id").notNull().default(""),
  bitlabsSecretKey: text("bitlabs_secret_key").notNull().default(""),
  adgemEnabled: boolean("adgem_enabled").notNull().default(false),
  adgemPublisherId: text("adgem_publisher_id").notNull().default(""),
  adgemApiKey: text("adgem_api_key").notNull().default(""),
  adgemWallId: text("adgem_wall_id").notNull().default(""),
  adgemPostbackSecret: text("adgem_postback_secret").notNull().default(""),
  taskBitlabsEnabled: boolean("task_bitlabs_enabled").notNull().default(true),
  taskAdgemEnabled: boolean("task_adgem_enabled").notNull().default(true),
  dailyBonusEnabled: boolean("daily_bonus_enabled").notNull().default(true),
  referralTasksEnabled: boolean("referral_tasks_enabled").notNull().default(true),
  tadsEnabled: boolean("tads_enabled").notNull().default(false),
  tadsAppId: text("tads_app_id").notNull().default(""),
  tadsSecretKey: text("tads_secret_key").notNull().default(""),
  tadsRewardedUnit: text("tads_rewarded_unit").notNull().default(""),
  tadsInterstitialUnit: text("tads_interstitial_unit").notNull().default(""),
  tadsBannerUnit: text("tads_banner_unit").notNull().default(""),
  rewardedAdReward: numeric("rewarded_ad_reward", { precision: 12, scale: 4 }).notNull().default("0.0500"),
  interstitialAdReward: numeric("interstitial_ad_reward", { precision: 12, scale: 4 }).notNull().default("0.0100"),
  bannerAdReward: numeric("banner_ad_reward", { precision: 12, scale: 4 }).notNull().default("0.0030"),
  referralSignupReward: numeric("referral_signup_reward", { precision: 12, scale: 4 }).notNull().default("1"),
  referralCommissionRate: numeric("referral_commission_rate", { precision: 7, scale: 4 }).notNull().default("0.05"),
  withdrawalMinimum: numeric("withdrawal_minimum", { precision: 12, scale: 4 }).notNull().default("5"),
  withdrawalsEnabled: boolean("withdrawals_enabled").notNull().default(false),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const activityLogsTable = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  actorUserId: integer("actor_user_id"),
  action: varchar("action", { length: 50 }).notNull(),
  entityType: varchar("entity_type", { length: 40 }).notNull(),
  entityId: text("entity_id"),
  details: text("details"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
