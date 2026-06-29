# Environment Variables

## Required

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string — `postgresql://user:pass@host/db` |
| `SESSION_SECRET` | Random secret for JWT signing (min 32 chars) |
| `TELEGRAM_BOT_TOKEN` | Bot token from BotFather |

## Strongly Recommended

| Variable | Description |
|---|---|
| `APP_URL` | Public HTTPS base URL (e.g. `https://myapp.com`). Used to generate postback URLs shown in Admin → provider tabs. |
| `WEB_ADMIN_USERNAME` | Username for the web admin login page |
| `WEB_ADMIN_PASSWORD` | Password for the web admin login page |

## Optional / Provider-specific

Existing provider credentials (AdGem, CPX Research, Lootably, Torox, Monetag, AdsGram) are stored in the `admin_settings` DB table and managed through the Admin Panel Settings tab.

The following new integrations use environment variables so they can be added without changing the database schema:

### Clickadu

| Variable | Description |
|---|---|
| `CLICKADU_ENABLED` | Set to `true` to enable |
| `CLICKADU_PUBLISHER_ID` | Your Clickadu publisher ID |
| `CLICKADU_API_KEY` | Your Clickadu API key |
| `CLICKADU_SECRET_KEY` | Secret used to verify postback signatures |
| `CLICKADU_REWARD_MULTIPLIER` | Multiplier applied before user reward (default `1`) |

### Monlix

| Variable | Description |
|---|---|
| `MONLIX_ENABLED` | Set to `true` to enable |
| `MONLIX_PUBLISHER_ID` | Your Monlix publisher ID |
| `MONLIX_API_KEY` | Your Monlix API key |
| `MONLIX_SECRET_KEY` | Secret used to verify postback signatures |
| `MONLIX_REWARD_MULTIPLIER` | Multiplier applied before user reward (default `1`) |

### GemiAds

| Variable | Description |
|---|---|
| `GEMIADS_ENABLED` | Set to `true` to enable |
| `GEMIADS_PUBLISHER_ID` | Your GemiAds publisher ID |
| `GEMIADS_API_KEY` | Your GemiAds API key |
| `GEMIADS_SECRET_KEY` | Secret used to verify postback signatures |
| `GEMIADS_REWARD_MULTIPLIER` | Multiplier applied before user reward (default `1`) |

### EarnWall

| Variable | Description |
|---|---|
| `EARNWALL_ENABLED` | Set to `true` to enable |
| `EARNWALL_PUBLISHER_ID` | Your EarnWall publisher ID |
| `EARNWALL_API_KEY` | Your EarnWall API key |
| `EARNWALL_SECRET_KEY` | Secret used to verify postback signatures |
| `EARNWALL_REWARD_MULTIPLIER` | Multiplier applied before user reward (default `1`) |

### Pollmatic

| Variable | Description |
|---|---|
| `POLLMATIC_ENABLED` | Set to `true` to enable |
| `POLLMATIC_API_KEY` | Your Pollmatic website API key |
| `POLLMATIC_SECRET_KEY` | Your Pollmatic secret key |
| `POLLMATIC_REWARD_MULTIPLIER` | Multiplier applied before user reward (default `1`) |

### Rewards Offerwall

| Variable | Description |
|---|---|
| `REWARDS_OFFERWALL_ENABLED` | Set to `true` to enable |
| `REWARDS_OFFERWALL_PUBLISHER_ID` | Your Rewards Offerwall publisher ID |
| `REWARDS_OFFERWALL_API_KEY` | Your Rewards Offerwall API key |
| `REWARDS_OFFERWALL_SECRET_KEY` | Secret used to verify postback signatures |
| `REWARDS_OFFERWALL_REWARD_MULTIPLIER` | Multiplier applied before user reward (default `1`) |

### Offerwall.me

| Variable | Description |
|---|---|
| `OFFERWALL_ME_ENABLED` | Set to `true` to enable |
| `OFFERWALL_ME_PUBLISHER_ID` | Your Offerwall.me publisher ID |
| `OFFERWALL_ME_API_KEY` | Your Offerwall.me API key |
| `OFFERWALL_ME_SECRET_KEY` | Secret used to verify postback signatures |
| `OFFERWALL_ME_REWARD_MULTIPLIER` | Multiplier applied before user reward (default `1`) |

## Example `.env`

```
DATABASE_URL=postgresql://postgres:password@localhost:5432/earnora
SESSION_SECRET=change-me-to-a-long-random-string
TELEGRAM_BOT_TOKEN=1234567890:ABC-DEFGHijklmno
APP_URL=https://myapp.example.com
WEB_ADMIN_USERNAME=admin
WEB_ADMIN_PASSWORD=supersecret
```
