# Changelog

## [2.0.0] — 2025-06 — Full Refactor (Phases 1–8)

### Removed
- **BitLabs** integration — routes, settings, frontend UI, all references.
- **TADS** integration — routes, settings, frontend UI, `react-tads-widget` dependency.

### Security
- **CPX Research**: `/api/cpx-research/config` now returns only the computed `secure_hash` (`MD5(MD5(uid) + MD5(secret))`), never the raw secret key.

### Added — New Providers

#### Lootably (offerwall)
- Backend: `server/routes/lootably.ts`
  - GET `/api/lootably/config` — authenticated, returns iframe URL.
  - GET `/api/lootably/postback` — SHA-1 signature verification, duplicate protection, VIP multiplier, referral commission.
- Frontend: `src/views/Lootably.tsx`, `pages/lootably.tsx`
- Navigation entry: "Lootably" in sidebar.
- Admin tab: "lootably" — conversions table, postback log, postback URL helper.
- Settings fields: `lootablyEnabled`, `lootablyPlacementId`, `lootablySecretKey`, `lootablyRewardMultiplier`.

#### Torox (offerwall)
- Backend: `server/routes/torox.ts`
  - GET `/api/torox/config`
  - GET `/api/torox/postback` — MD5 signature verification, duplicate protection, VIP multiplier, referral commission.
- Frontend: `src/views/Torox.tsx`, `pages/torox.tsx`
- Navigation entry: "Torox" in sidebar.
- Admin tab: "torox" — conversions table, postback log, postback URL helper.
- Settings fields: `toroxEnabled`, `toroxAppId`, `toroxSecretKey`, `toroxRewardMultiplier`.

#### Monetag (rewarded ads)
- Backend: `server/routes/monetag.ts`
  - GET `/api/monetag/config`
  - POST `/api/monetag/session/start` — creates ad session with rate-limit (1 per 5 min per user).
  - POST `/api/monetag/session/complete` — verifies token, credits reward via VIP multiplier.
- Frontend: `src/views/Monetag.tsx`, `pages/monetag.tsx`
- Navigation entry: "Monetag" in sidebar.
- Admin tab: "monetag" — rewards table.
- Script tag added to `pages/_app.tsx`.
- Settings fields: `monetagEnabled`, `monetagZoneId`, `monetagRewardedReward`, `monetagRewardedRevenue`.

### Updated
- **Admin Panel** (`src/views/Admin.tsx`):
  - Tabs updated: removed "bitlabs", added "lootably", "torox", "monetag".
  - Analytics: removed BitLabs/TADS metrics, added CPX/AdsGram/Lootably/Torox/Monetag revenue.
  - Settings form: removed BitLabs/TADS fields, added all new provider fields with correct labels.
- **Navigation** (`src/components/DashboardLayout.tsx`):
  - "BitLabs" label → "CPX Surveys".
  - Added Lootably, Torox, Monetag nav items with distinct Lucide icons.
- **DB schema** (`server/db/index.ts`, `schema.sql`):
  - Added 12 new columns to `admin_settings` (4 per new provider).
- **i18n** (`src/context/LanguageContext.tsx`):
  - Added keys for all new providers in English and Arabic.
- **Server routes index** (`server/routes/index.ts`):
  - Registered `/api/lootably`, `/api/torox`, `/api/monetag`.

### Security & Integrity (all new providers)
- Signature verification on every postback (SHA-1 for Lootably, MD5 for Torox).
- Duplicate/idempotency check: transaction ID uniqueness enforced at DB level.
- Every postback attempt logged to `webhook_logs` with full payload, IP, UA, and signature result.
- Rate limiting for Monetag session/start (in-process, 5-minute cooldown per user).
- Session token verification for Monetag reward completion.
