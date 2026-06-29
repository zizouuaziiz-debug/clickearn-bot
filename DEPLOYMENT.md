# Deployment Notes

## Prerequisites
- Node.js 18+
- PostgreSQL 14+
- pnpm 8+

## Steps

1. **Extract & install**
   ```bash
   unzip earnora-bot-refactored.zip
   cd earnora-bot-main
   pnpm install
   ```

2. **Set environment variables** (see `ENV.md`)

3. **Run DB migration** (see `MIGRATION.md` — the ALTER TABLE block)

4. **Build**
   ```bash
   pnpm run build   # or: NODE_ENV=production pnpm run build
   ```

5. **Start server**
   ```bash
   pnpm run start   # or: node dist/server.js
   ```

6. **Configure providers in the Admin panel** → Settings tab:
   - Enter each provider's credentials.
   - Toggle the provider's "Enabled" switch.
   - Copy each provider's Postback / Reward URL and register it in that provider's dashboard.

## Telegram Mini App
- Set `TELEGRAM_BOT_TOKEN` and update the Webhook URL in BotFather.
- Set `APP_URL` to your public HTTPS domain so postback URLs are generated correctly.

## Provider Dashboards — Postback URLs to register

| Provider | URL to register |
|---|---|
| Lootably | `https://YOUR_DOMAIN/api/lootably/postback` |
| Torox | `https://YOUR_DOMAIN/api/torox/postback` |
| CPX Research | `https://YOUR_DOMAIN/api/cpx-research/postback` |
| AdGem | `https://YOUR_DOMAIN/api/offers/postback` |
| AdsGram | Configure reward URL in AdsGram dashboard |
| Monetag | No server-side postback needed (session-based) |
