# Migration Notes

## From Original → Refactored (Phase 2–3)

### Removed integrations
- **BitLabs** — all routes, settings columns, and frontend references removed.
- **TADS** — all routes, settings columns, SDK dependency removed. `react-tads-widget` uninstalled.

### Security fix
- CPX Research: `/api/cpx-research/config` no longer returns the raw secret key. It now returns the computed `secure_hash = MD5(MD5(uid) + MD5(secret))` per the CPX Research postback spec.

## From Refactored → Phase 4+ (new providers)

### New DB columns (run against your existing database)

```sql
-- Copy the block below and execute it in production:
ALTER TABLE admin_settings
  ADD COLUMN IF NOT EXISTS lootably_enabled         BOOLEAN       NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lootably_placement_id    TEXT          NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS lootably_secret_key      TEXT          NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS lootably_reward_multiplier NUMERIC(8,4) NOT NULL DEFAULT 1.0000,
  ADD COLUMN IF NOT EXISTS torox_enabled            BOOLEAN       NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS torox_app_id             TEXT          NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS torox_secret_key         TEXT          NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS torox_reward_multiplier  NUMERIC(8,4)  NOT NULL DEFAULT 1.0000,
  ADD COLUMN IF NOT EXISTS monetag_enabled          BOOLEAN       NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS monetag_zone_id          TEXT          NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS monetag_rewarded_reward  NUMERIC(12,4) NOT NULL DEFAULT 0.0030,
  ADD COLUMN IF NOT EXISTS monetag_rewarded_revenue NUMERIC(12,4) NOT NULL DEFAULT 0.0060;
```

No existing data is affected — all new columns have safe defaults.

### New routes registered
- `/api/lootably/config` · `/api/lootably/postback`
- `/api/torox/config` · `/api/torox/postback`
- `/api/monetag/config` · `/api/monetag/session/start` · `/api/monetag/session/complete`

### No removals of existing provider data
The `adgem`, `cpx_research`, and `adsgram` integrations are unchanged.
