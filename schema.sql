-- ClickEarn Telegram Mini App schema
-- Telegram only: email/password fields removed completely.

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  telegram_id TEXT NOT NULL UNIQUE,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  name TEXT NOT NULL,
  profile_photo TEXT,
  language_code TEXT,
  referral_code VARCHAR(20) NOT NULL UNIQUE,
  referred_by INTEGER,
  vip_level INTEGER NOT NULL DEFAULT 0,
  balance NUMERIC(12, 4) NOT NULL DEFAULT 0,
  pending_balance NUMERIC(12, 4) NOT NULL DEFAULT 0,
  total_earned NUMERIC(12, 4) NOT NULL DEFAULT 0,
  total_withdrawn NUMERIC(12, 4) NOT NULL DEFAULT 0,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  is_banned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  available_balance NUMERIC(12, 4) NOT NULL DEFAULT 0,
  pending_balance NUMERIC(12, 4) NOT NULL DEFAULT 0,
  total_earned NUMERIC(12, 4) NOT NULL DEFAULT 0,
  total_withdrawn NUMERIC(12, 4) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_id INTEGER REFERENCES wallets(id),
  type VARCHAR(60) NOT NULL,
  category VARCHAR(40) NOT NULL,
  direction VARCHAR(10) NOT NULL,
  amount NUMERIC(12, 4) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'completed',
  description TEXT NOT NULL,
  source VARCHAR(40) NOT NULL DEFAULT 'system',
  reference_id TEXT,
  metadata TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS referrals (
  id SERIAL PRIMARY KEY,
  referrer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  referral_code VARCHAR(20) NOT NULL,
  signup_reward NUMERIC(12, 4) NOT NULL DEFAULT 0,
  commission_rate NUMERIC(7, 4) NOT NULL DEFAULT 0,
  total_commission NUMERIC(12, 4) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vip_levels (
  id SERIAL PRIMARY KEY,
  level INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  price NUMERIC(12, 4) NOT NULL DEFAULT 0,
  benefits TEXT NOT NULL DEFAULT '[]',
  multiplier NUMERIC(8, 4) NOT NULL DEFAULT 1,
  daily_limit INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS offerwall_conversions (
  id SERIAL PRIMARY KEY,
  provider VARCHAR(20) NOT NULL,
  conversion_type VARCHAR(30) NOT NULL DEFAULT 'offer',
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  external_user_id TEXT NOT NULL,
  transaction_id TEXT NOT NULL UNIQUE,
  offer_id TEXT,
  task_id TEXT,
  goal_id TEXT,
  title TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'completed',
  reward_amount NUMERIC(12, 4) NOT NULL DEFAULT 0,
  revenue_usd NUMERIC(12, 4) NOT NULL DEFAULT 0,
  multiplier_applied NUMERIC(8, 4) NOT NULL DEFAULT 1,
  source_event TEXT,
  ip_address TEXT,
  user_agent TEXT,
  raw_payload TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ad_units (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  provider VARCHAR(20) NOT NULL DEFAULT 'tads',
  ad_type VARCHAR(20) NOT NULL,
  unit_key TEXT NOT NULL,
  placement TEXT NOT NULL DEFAULT 'ads_wall',
  reward NUMERIC(12, 4) NOT NULL DEFAULT 0,
  revenue_per_view NUMERIC(12, 4) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ad_rewards (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ad_unit_id INTEGER NOT NULL REFERENCES ad_units(id) ON DELETE CASCADE,
  provider VARCHAR(20) NOT NULL DEFAULT 'tads',
  ad_type VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'started',
  reward NUMERIC(12, 4) NOT NULL DEFAULT 0,
  revenue NUMERIC(12, 4) NOT NULL DEFAULT 0,
  impression_count INTEGER NOT NULL DEFAULT 0,
  click_count INTEGER NOT NULL DEFAULT 0,
  verification_token TEXT,
  completion_proof TEXT,
  metadata TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS withdrawals (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(12, 4) NOT NULL,
  method TEXT NOT NULL,
  destination TEXT NOT NULL DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deposits (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vip_level INTEGER NOT NULL DEFAULT 0,
  amount NUMERIC(12, 4) NOT NULL,
  method TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webhook_logs (
  id SERIAL PRIMARY KEY,
  provider VARCHAR(20) NOT NULL,
  event_type VARCHAR(30) NOT NULL DEFAULT 'callback',
  http_method VARCHAR(10) NOT NULL,
  status VARCHAR(30) NOT NULL,
  signature_valid BOOLEAN NOT NULL DEFAULT false,
  user_id INTEGER,
  reference_id TEXT,
  payload TEXT NOT NULL,
  response_body TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  audience VARCHAR(30) NOT NULL DEFAULT 'all',
  locale VARCHAR(10) NOT NULL DEFAULT 'all',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_settings (
  id SERIAL PRIMARY KEY,
  telegram_bot_token TEXT NOT NULL DEFAULT '',
  telegram_bot_username TEXT NOT NULL DEFAULT '',
  telegram_mini_app_url TEXT NOT NULL DEFAULT '',
  telegram_stars_enabled BOOLEAN NOT NULL DEFAULT false,
  ton_wallet_address TEXT NOT NULL DEFAULT '',
  branding_name TEXT NOT NULL DEFAULT 'ClickEarn',
  branding_logo_url TEXT NOT NULL DEFAULT '',
  default_locale VARCHAR(10) NOT NULL DEFAULT 'en',
  bitlabs_enabled BOOLEAN NOT NULL DEFAULT false,
  bitlabs_maintenance_mode BOOLEAN NOT NULL DEFAULT false,
  bitlabs_api_key TEXT NOT NULL DEFAULT '',
  bitlabs_app_id TEXT NOT NULL DEFAULT '',
  bitlabs_secret_key TEXT NOT NULL DEFAULT '',
  adgem_enabled BOOLEAN NOT NULL DEFAULT false,
  adgem_publisher_id TEXT NOT NULL DEFAULT '',
  adgem_api_key TEXT NOT NULL DEFAULT '',
  adgem_wall_id TEXT NOT NULL DEFAULT '',
  adgem_postback_secret TEXT NOT NULL DEFAULT '',
  task_bitlabs_enabled BOOLEAN NOT NULL DEFAULT true,
  task_adgem_enabled BOOLEAN NOT NULL DEFAULT true,
  daily_bonus_enabled BOOLEAN NOT NULL DEFAULT true,
  referral_tasks_enabled BOOLEAN NOT NULL DEFAULT true,
  tads_enabled BOOLEAN NOT NULL DEFAULT false,
  tads_app_id TEXT NOT NULL DEFAULT '',
  tads_secret_key TEXT NOT NULL DEFAULT '',
  tads_rewarded_unit TEXT NOT NULL DEFAULT '',
  tads_interstitial_unit TEXT NOT NULL DEFAULT '',
  tads_banner_unit TEXT NOT NULL DEFAULT '',
  rewarded_ad_reward NUMERIC(12, 4) NOT NULL DEFAULT 0.0500,
  interstitial_ad_reward NUMERIC(12, 4) NOT NULL DEFAULT 0.0100,
  banner_ad_reward NUMERIC(12, 4) NOT NULL DEFAULT 0.0030,
  referral_signup_reward NUMERIC(12, 4) NOT NULL DEFAULT 1,
  referral_commission_rate NUMERIC(7, 4) NOT NULL DEFAULT 0.05,
  withdrawal_minimum NUMERIC(12, 4) NOT NULL DEFAULT 5,
  withdrawals_enabled BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  actor_user_id INTEGER,
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(40) NOT NULL,
  entity_id TEXT,
  details TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  reward NUMERIC(12, 4) NOT NULL,
  type VARCHAR(30) NOT NULL DEFAULT 'general',
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_completions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, task_id)
);

CREATE TABLE IF NOT EXISTS offers (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  reward NUMERIC(12, 4) NOT NULL,
  image_url TEXT NOT NULL,
  cta_label TEXT NOT NULL,
  cta_url TEXT NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'general',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO admin_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

INSERT INTO vip_levels (level, name, price, benefits, multiplier, daily_limit, is_active) VALUES
  (1, 'VIP 1', 25, '["10% reward boost","Priority ad queue","Higher daily ad cap"]', 1.10, 10, true),
  (2, 'VIP 2', 60, '["25% reward boost","Priority offer access","Faster withdrawal review"]', 1.25, 20, true),
  (3, 'VIP 3', 120, '["50% reward boost","Referral commission boost","Exclusive campaigns"]', 1.50, 35, true),
  (4, 'VIP 4', 250, '["80% reward boost","VIP-only placements","Premium support"]', 1.80, 50, true),
  (5, 'VIP 5', 500, '["120% reward boost","Highest daily limits","Top payout priority"]', 2.20, 75, true)
ON CONFLICT (level) DO NOTHING;

INSERT INTO ad_units (name, provider, ad_type, unit_key, placement, reward, revenue_per_view, is_active) VALUES
  ('Rewarded Ad', 'tads', 'rewarded', 'tads_rewarded_default', 'ads_wall', 0.0500, 0.1000, true),
  ('Interstitial Ad', 'tads', 'interstitial', 'tads_interstitial_default', 'dashboard', 0.0100, 0.0300, true),
  ('Banner Ad', 'tads', 'banner', 'tads_banner_default', 'dashboard_footer', 0.0030, 0.0050, true)
ON CONFLICT DO NOTHING;

INSERT INTO tasks (title, description, reward, type) VALUES
  ('Share your referral link', 'Share your Telegram Mini App referral link with a friend.', 0.2500, 'referral'),
  ('Invite your first user', 'Bring your first referred user and unlock extra referral rewards.', 1.0000, 'referral'),
  ('Daily check-in', 'Open the Telegram Mini App today and claim your daily bonus.', 0.0500, 'daily_bonus')
ON CONFLICT DO NOTHING;
