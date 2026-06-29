# ClickEarn Project Analysis Report

> **Update:** Rebranding to **Earnora** has been completed. This report documents the system as it existed before the rename and remains valid for architecture/reference purposes.
>
> Prepared before rebranding to **Earnora**.  
> This report documents the current architecture, integrations, reward flow, and data model exactly as they exist today. No logic changes were made during analysis.

---

## 1. Executive Summary

ClickEarn is a **Next.js 14 (Pages Router) + Express + PostgreSQL** Telegram Mini App platform. Users earn money by completing offerwalls, watching rewarded ads, taking surveys, inviting referrals, and claiming daily bonuses. An embedded admin panel manages users, withdrawals, provider settings, and analytics.

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14, React 18, TypeScript 5 |
| Styling | Tailwind CSS 3, next-themes |
| Backend | Express 5 mounted through Next.js API catch-all |
| Database | PostgreSQL via `pg` + Drizzle ORM |
| Auth | Telegram Mini App `initData` verification + JWT (jsonwebtoken) |
| Deploy target | Vercel / Node.js server |

---

## 2. Architecture

### 2.1 Project Layout

```
/home/clickearn-bot
├── pages/                     # Next.js pages + API entry points
│   ├── _app.tsx               # Global providers, scripts, SW registration
│   ├── api/[[...path]].ts     # Catch-all: mounts Express app under /api
│   ├── api/adgem/postback.ts  # Standalone AdGem postback (TODO stub)
│   ├── index.tsx              # Marketing landing page
│   ├── dashboard.tsx          # User dashboard
│   ├── wallet.tsx             # Wallet & withdrawals
│   ├── tasks.tsx              # Tasks & daily bonus
│   ├── offers.tsx             # AdGem offers
│   ├── ads.tsx                # Ads Wall (AdsGram)
│   ├── surveys.tsx            # CPX Research surveys
│   ├── lootably.tsx           # Lootably offerwall
│   ├── torox.tsx              # Torox offerwall
│   ├── vip.tsx                # VIP upgrades
│   ├── referral.tsx           # Referral program
│   ├── admin-login.tsx        # Web admin login
│   └── admin.tsx              # Admin panel
├── src/
│   ├── views/                 # Page-level view components
│   ├── components/            # Reusable UI + layouts
│   ├── context/               # AuthContext, LanguageContext
│   ├── lib/                   # Client helpers (telegram, adsgram, cpx, tads)
│   ├── styles/                # Tailwind globals
│   └── compat/                # react-router-dom compatibility shim
├── server/
│   ├── app.ts                 # Express factory
│   ├── routes/                # Domain routers
│   ├── middleware/auth.ts     # JWT auth middleware
│   ├── lib/                   # Business logic
│   └── db/index.ts            # Drizzle schema + connection
├── schema.sql                 # Reference DB schema
└── types/                     # TypeScript declarations
```

### 2.2 API Routing

- `server/app.ts` creates an Express app, enables CORS (`origin: "*"`), JSON/urlencoded parsing, and mounts `server/routes/index.ts` at `/api`.
- `server/routes/index.ts` wires domain routers:
  - `/auth`, `/wallet`, `/tasks`, `/surveys`, `/vip`, `/offers`, `/referral`, `/admin`
  - Offerwall/ad routers: `/cpx-research`, `/adsgram`, `/lootably`, `/torox`, `/monetag`
  - `/healthz`
- `pages/api/[[...path]].ts` is the Next.js catch-all. It imports the Express app, disables body parsing, normalizes `req.url` to `/api/...`, and delegates to Express.
- `pages/api/adgem/postback.ts` is a separate Next.js route (`/api/adgem/postback`) that is currently a TODO stub and is not wired into the Express app.

### 2.3 Database Layer

- **Drizzle ORM** over `node-postgres` (`pg`).
- Connection configured from `DATABASE_URL` env var.
- SSL disabled for localhost; otherwise `ssl: { rejectUnauthorized: false }`.

### 2.4 Key Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | JWT signing secret |
| `TELEGRAM_BOT_TOKEN` | Yes | Telegram Mini App auth verification |
| `APP_URL` | Strongly recommended | Public HTTPS URL for generated postback URLs |
| `WEB_ADMIN_USERNAME` | Recommended | Web admin login username |
| `WEB_ADMIN_PASSWORD` / `WEB_ADMIN_PASSWORD_HASH` | Recommended | Web admin login password |

Provider credentials are stored in the `admin_settings` DB table and managed through the Admin panel, not environment variables.

---

## 3. Authentication & User Registration

### 3.1 Telegram Mini App Auth

1. **Client detection**: `src/lib/telegram.ts` checks `window.Telegram.WebApp.initData`.
2. **Bootstrap**: `TelegramMiniAppBootstrap.tsx` calls `webApp.ready()` and `webApp.expand()`.
3. **Referral capture**: On open, `start_param` is read, any `ref_` prefix is stripped, and the code is stored in `localStorage` under `clickearn_referral_code`.
4. **Auto-auth**: `AuthContext.tsx` detects Telegram environment and calls `authenticateWithTelegram()`, sending `initData` to `POST /api/auth/telegram`.

### 3.2 Server-Side Verification

`server/routes/auth.ts` → `verifyTelegramInitData()` (`server/lib/telegram.ts`):

- Parses query string, excludes `hash`, sorts keys alphabetically.
- Recomputes HMAC-SHA256 using secret derived from `WebAppData` + bot token.
- Timing-safe comparison; rejects data older than 24 hours or with future `auth_date`.

### 3.3 User Creation / Update

- **Existing user**: updates profile fields, ensures wallet exists, checks ban status.
- **New user**:
  - Extracts referral code from `verified.startParam` (supports `ref_<code>` or raw code).
  - Looks up referrer by `referralCode`.
  - Inserts user with generated 8-character alphanumeric `referralCode`, sets `referredBy`.
  - Creates wallet row.
  - Logs `user_created`.

### 3.4 Session / JWT

- Tokens signed with `jsonwebtoken`, secret from `SESSION_SECRET` (fallback hardcoded in `server/middleware/auth.ts`).
- Telegram user payload: `{ userId, telegramId, isAdmin }`.
- Web admin payload: `{ userId: 0, telegramId: "web-admin:<username>", isAdmin: true, authMethod: "web-admin", adminUsername }`.
- Client stores token in `localStorage` as `clickearn_token`.
- On load, `AuthContext` calls `GET /api/auth/me` to hydrate user.

### 3.5 Web Admin Login

- `pages/admin-login.tsx` renders `src/views/AdminLogin.tsx`.
- POST to `/api/auth/web-admin/login`.
- Credentials compared against `WEB_ADMIN_USERNAME` / `ADMIN_USERNAME` and `WEB_ADMIN_PASSWORD` / `ADMIN_PASSWORD` or bcrypt hash `WEB_ADMIN_PASSWORD_HASH` / `ADMIN_PASSWORD_HASH`.
- On success, issues admin JWT and redirects to `/admin`.

---

## 4. Reward, Points & Transaction System

### 4.1 Balance Storage

Balances live in two places:

- **`wallets`** table (source of truth): `available_balance`, `pending_balance`, `total_earned`, `total_withdrawn`.
- **`users`** table (denormalized snapshot): same four fields.

`ensureWallet(userId)` creates a wallet if missing. `updateWalletBalancesInExecutor()` locks the wallet row, updates `wallets`, then syncs back to `users`.

### 4.2 Core Reward Function: `creditRewardWithVip()`

Located in `server/lib/finance.ts`.

```
baseAmount × sourceMultiplier → effectiveBaseAmount
effectiveBaseAmount × vipMultiplier → totalCredited
```

- VIP multiplier is skipped for `referral_reward` and `vip_bonus` types.
- Wallet is credited (`availableBalance += totalCredited`, `totalEarned += totalCredited`).
- Transaction mode:
  - `split_vip`: base transaction + separate `earn_vip_bonus` transaction.
  - `single_total`: one combined transaction.
- Activity logged.

### 4.3 Transaction Recording

`createTransaction()` inserts into `transactions`:

- `type`: `ad_reward`, `task_reward`, `daily_bonus`, `withdraw`, `earn_referral_commission`, etc.
- `category`: `ad_reward`, `offer_reward`, `withdrawal`, `referral_reward`, `vip_bonus`
- `direction`: `credit` or `debit`
- `amount`, `status` (default `completed`), `description`, `source`, `referenceId`, `metadata`

Wallet route returns the latest 50 transactions ordered by `createdAt DESC`.

### 4.4 Referral Rewards

`server/routes/referral.ts`:

- `GET /api/referral`: returns referral link, totals, signup reward, commission rate, recent commissions.
- `GET /api/referral/referred`: list of referred users.
- Referral link formats:
  - Telegram: `https://t.me/<botUsername>?startapp=ref_<code>`
  - Web Mini App: `<miniAppUrl>?startapp=ref_<code>`

`creditReferralCommission()`:

- Looks up referrer via `referralsTable`.
- Commission = `earnedAmount × commissionRate`.
- Credits referrer wallet and creates `earn_referral_commission` transaction.
- Updates `referrals.totalCommission`.

**Important note**: The Telegram auth route creates the `users` row and stores `referredBy`, but does **not** insert a row into `referralsTable` or credit the referrer signup reward. This appears to be a missing step in the current flow.

Default settings: `referralSignupReward = $1`, `referralCommissionRate = 5%`.

### 4.5 Daily Bonus & Tasks

`server/routes/tasks.ts`:

- `GET /api/tasks`: provider categories, daily bonus status, custom tasks.
- `POST /api/tasks/:taskId/complete`: checks task exists and not already completed, inserts `task_completions`, credits reward.
- `POST /api/tasks/daily-bonus/claim`: checks `dailyBonusEnabled`, ensures no `daily_bonus` transaction exists for current calendar day, credits `rewardedAdReward` (default `$0.05`).

### 4.6 VIP Levels & Multipliers

`ensureDefaultVipLevels()` seeds 5 levels:

| Level | Price | Multiplier | Daily Limit |
|-------|-------|------------|-------------|
| VIP 1 | $25   | 1.10x      | 10          |
| VIP 2 | $60   | 1.25x      | 20          |
| VIP 3 | $120  | 1.50x      | 35          |
| VIP 4 | $250  | 1.80x      | 50          |
| VIP 5 | $500  | 2.20x      | 75          |

`POST /api/vip/deposit`: records a `deposits` row and sets `users.vipLevel = max(current, target)`. Deposit is marked `completed` immediately without external payment verification.

---

## 5. Ads Wall, Surveys & Offerwall Integrations

### 5.1 AdsGram (Rewarded Ads)

**Files**: `server/routes/adsgram.ts`, `src/lib/adsgram.ts`, `pages/ads.tsx`, `src/views/AdsWall.tsx`

- SDK loaded globally via `<Script>` in `pages/_app.tsx`.
- `src/lib/adsgram.ts` wraps `window.Adsgram.init({ blockId })`.
- Reward flow (client-driven):
  1. `POST /api/adsgram/session/start` creates `ad_rewards` row with `status='started'` and `verificationToken`.
  2. Client calls `controller.show()`; on resolution sends `POST /api/adsgram/session/complete`.
  3. Server checks `adResult.done`, calls `creditRewardWithVip()`, updates row to `completed`.
- Postback: `GET /api/adsgram/reward?userid=...` logs event only; actual crediting is client-driven.
- Duplicate prevention: `/session/complete` checks existing row status.

### 5.2 BitLabs / TADS

**Status**: Removed. `server/routes/ads.ts` and `src/lib/tads.ts` return `410 Gone`.

### 5.3 AdGem

**Files**: `pages/api/adgem/postback.ts`, `server/routes/offers.ts`

- `pages/api/adgem/postback.ts` is a TODO stub that only logs parameters; does **not** verify signatures, prevent duplicates, or credit rewards.
- `server/routes/offers.ts` contains the real AdGem callback handler at `/api/offers/postback` with signature verification, duplicate protection, and reward crediting.

### 5.4 CPX Research (Surveys)

**Files**: `server/routes/cpx-research.ts`, `server/routes/surveys.ts`, `src/lib/cpx-research.ts`, `pages/surveys.tsx`, `src/views/Surveys.tsx`

- Config endpoint computes iframe URL and `secure_hash = MD5(MD5(ext_user_id) + MD5(secret_key))`.
- Postback: `GET /api/cpx-research/postback` with `status`, `trans_id`, `user_id`, `amount_local`, `amount_usd`, `secure_hash`.
- If `status === '1'`, verifies signature `MD5(trans_id - secretKey)`, credits user, inserts `offerwall_conversions` row.
- Handles reversals (`status === '2'`) by marking conversion as `reversed`.
- Duplicate prevention: unique `transactionId` (`trans_id`).

### 5.5 Lootably

**Files**: `server/routes/lootably.ts`, `pages/lootably.tsx`, `src/views/Lootably.tsx`

- Config endpoint builds iframe URL: `https://wall.lootably.com/?placementID=...&uid=...&callback=...`.
- Postback: `GET /api/lootably/postback` with `uid`, `tid`, `amount`, `hash`.
- Verifies SHA-1 signature: `SHA1(placementId + uid + amount + tid + secret)`.
- Applies reward multiplier, credits via `creditRewardWithVip()`, inserts `offerwall_conversions` row.
- Duplicate prevention: queries by `provider='lootably'` + `transactionId=tid`.

### 5.6 Torox

**Files**: `server/routes/torox.ts`, `pages/torox.tsx`, `src/views/Torox.tsx`

- Config endpoint builds iframe URL: `https://www.torox.io/ifr/?ident=...&userid=...&adformat=1`.
- Postback: `GET /api/torox/postback` with `userid`, `tid`, `amount`, `hash`.
- Verifies MD5 signature: `MD5(userid + amount + tid + secret)`.
- Applies multiplier, credits, inserts `offerwall_conversions` row.
- Duplicate prevention: queries by `provider='torox'` + `transactionId=tid`.

### 5.7 Monetag

**Files**: `server/routes/monetag.ts`

- SDK loaded globally in `pages/_app.tsx`; service worker registered.
- `/api/monetag/config` returns `zoneId` and `rewardedReward`.
- Reward flow:
  1. `POST /api/monetag/session/start` creates `ad_rewards` row (`status='started'`) with random `verificationToken`; enforces 5-minute cooldown per user.
  2. Client invokes global `show_<zoneId>()` then calls `POST /api/monetag/session/complete`.
  3. Server validates token, marks completed, credits reward.
- Postback: `POST/GET /api/monetag/postback` matches session by `ymid`.
- Duplicate prevention: cooldown, token validation, and status checks.

### 5.8 Tracking Tables

- **`ad_units`**: inventory metadata (`provider`, `adType`, `unitKey`, `placement`, `reward`, `revenuePerView`, `isActive`).
- **`ad_rewards`**: per-ad-view sessions (`status`: `started`/`completed`/`skipped`, `verificationToken`, `completionProof`, etc.).
- **`offerwall_conversions`**: offerwall completions from CPX Research, AdGem, Lootably, Torox.
- **`webhook_logs`**: every external callback/postback with provider, event type, HTTP method, status, signature validity, payload, response.

---

## 6. Withdrawal System

### 6.1 Request Flow

`POST /api/wallet/withdraw`:

- Validates `amount > 0`, `method`, optional `destination`.
- Checks `withdrawalsEnabled` in `admin_settings`.
- Enforces `amount >= withdrawalMinimum` (default `$5`).
- Checks `walletSnapshot.balance >= amount`.
- Inserts `withdrawals` row with status `pending`.
- Calls `createWithdrawalHold()`:
  - `availableBalance -= amount`
  - `pendingBalance += amount`
  - `totalWithdrawn += amount`
  - Creates `withdraw` transaction with `status: "pending"`.

### 6.2 Finalization

`finalizeWithdrawal()`:

- **Approved**: `pendingBalance -= amount` only.
- **Rejected**: `pendingBalance -= amount`, `availableBalance += amount`, `totalWithdrawn -= amount`, and creates `withdrawal_reversal` credit transaction.

### 6.3 UI Methods

PayPal, Binance, Bank Transfer, Wise, TON, Telegram Stars.

---

## 7. Database Schema

### 7.1 Core Tables

| Table | Purpose |
|-------|---------|
| `users` | Telegram users, profile, balances (denormalized), VIP level, ban/admin flags |
| `wallets` | Source-of-truth balances per user |
| `transactions` | All credit/debit events |
| `referrals` | Referral relationships and commissions |
| `vip_levels` | VIP tiers, multipliers, daily limits |
| `withdrawals` | Withdrawal requests and status |
| `deposits` | VIP deposit records |
| `tasks` | Custom platform tasks |
| `task_completions` | User task completions |
| `offers` | Featured offers |
| `announcements` | Admin announcements |
| `activity_logs` | Audit log |
| `webhook_logs` | External provider callbacks |
| `admin_settings` | Platform configuration and provider credentials |
| `ad_units` | Ad inventory |
| `ad_rewards` | Ad session/reward records |
| `offerwall_conversions` | Offerwall conversion records |

### 7.2 Key Default Settings (`admin_settings`)

- `brandingName` default: `"ClickEarn"`
- `referralSignupReward`: `$1`
- `referralCommissionRate`: `5%`
- `withdrawalMinimum`: `$5`
- `rewardedAdReward`: `$0.05`
- `interstitialAdReward`: `$0.01`
- `bannerAdReward`: `$0.003`

---

## 8. Current Branding Occurrences

The following files contain "ClickEarn", "Clickearn", or "clickearn" branding that will be renamed to **Earnora**:

| File | Occurrence | Type |
|------|------------|------|
| `README.md` | Title | Documentation |
| `ENV.md` | Example DB name `clickearn` | Documentation |
| `DEPLOYMENT.md` | Zip/folder names `clickearn-bot-refactored.zip`, `clickearn-bot-main` | Documentation |
| `package.json` | `"name": "clickearn-nextjs"` | Config |
| `package-lock.json` | `"name": "clickearn-nextjs"` | Generated config |
| `schema.sql` | Comment + `branding_name` default | Schema reference |
| `server/db/index.ts` | `brandingName` default `"ClickEarn"` | Schema/code |
| `server/middleware/auth.ts` | Fallback JWT secret `"clickearn-secret-change-me"` | Config/security |
| `server/routes/referral.ts` | Referral share text "Join ClickEarn on Telegram" | User-facing text |
| `src/components/DashboardLayout.tsx` | Sidebar logo "ClickEarn" | UI |
| `src/components/TelegramMiniAppBootstrap.tsx` | `localStorage` key `clickearn_referral_code` | Client storage |
| `src/context/AuthContext.tsx` | `localStorage` token key `clickearn_token` | Client storage |
| `src/context/LanguageContext.tsx` | Translations + `localStorage` lang key `clickearn_lang` | UI + storage |
| `src/views/Home.tsx` | Logo text, image alt text, footer copyright | UI |

**No logic, IDs, database structure, integrations, or features will be changed.** Only branding text, default values, and client-side storage key names will be updated.

---

## 9. Identified Gaps / Notes

1. **AdGem standalone postback**: `pages/api/adgem/postback.ts` is a stub and not integrated. The real handler lives under `/api/offers/postback`.
2. **Referral table creation**: New users store `referredBy`, but no row is inserted into `referralsTable` and no signup reward is credited during Telegram auth.
3. **VIP deposit payment verification**: `POST /api/vip/deposit` records the deposit as `completed` without verifying external payment.
4. **Branding is currently hardcoded in multiple UI files** rather than being read dynamically from `admin_settings.brandingName`.

---

*Report generated before Earnora rebrand. Backup created at `/home/clickearn-bot-backup-*.tar.gz`.*
