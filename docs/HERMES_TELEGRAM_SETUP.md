# Configuring Telegram with Hermes (Adams Platform)

How to let Adams Electric team members chat with Hermes on Telegram and have it
answer questions grounded in platform data (AdamsBrain / GBrain, docs, code).

## How it fits together

- **Hermes gateway** runs inside the `hermes` container and connects to Telegram
  via **long polling** — no public webhook URL or ingress needed.
- **GBrain grounding:** the website writes `RESOLVER.md` and `HERMES_MEMORY.json`
  into a shared volume mounted in Hermes at `/opt/data/memories/gbrain`. Hermes
  also has the `AdamsHarnessPlatform` repo cloned at
  `/opt/data/workspace/AdamsHarnessPlatform`. Anything synced there is what
  Hermes "knows" about the platform.
- **Crons** reuse `TELEGRAM_HOME_CHANNEL` to send failure alerts.

> **Use a different bot than the website's.** The site calls `setWebhook` on its
> own `TELEGRAM_BOT_TOKEN` (see `app/api/telegram/webhook`), which breaks
> Hermes' long-polling if both share one bot. Create a second bot.

## Prerequisites

- Docker stack running: `cd C:\Users\BrianStitt\adams-hermes-docker; docker compose up -d`
- Hermes model credentials working (chat completion returns a real answer —
  verified with `npx tsx scripts/_hermes-ping.mts http://localhost:18642` from the
  `svp-platform` repo).

## Step 1 — Create a Telegram bot

1. In Telegram, message **@BotFather**.
2. Send `/newbot`, pick a name (e.g. "Adams Hermes") and username
   (must end in `bot`, e.g. `@adams_hermes_bot`).
3. Copy the **bot token** (`123456:ABC...`).

## Step 2 — Get your Telegram user ID

1. Message **@userinfobot** (or @getmyid_bot) in Telegram.
2. Copy the numeric **Id** (e.g. `123456789`). This is required — Hermes has
   terminal access inside its container, so it refuses open access.

## Step 3 — Configure (local Docker)

Edit `C:\Users\BrianStitt\adams-hermes-docker\env\hermes.env`:

```dotenv
TELEGRAM_BOT_TOKEN=123456:ABC-your-bot-token
TELEGRAM_ALLOWED_USERS=123456789            # comma-separate more IDs if needed
TELEGRAM_HOME_CHANNEL=123456789             # where cron alerts go (usually your ID)
```

Leave `ANTHROPIC_API_KEY` as-is if the container already authenticates (auth is
persisted in the `hermes-data` volume).

## Step 4 — Restart and verify

```powershell
cd C:\Users\BrianStitt\adams-hermes-docker
docker compose up -d hermes        # recreates container with new env
docker exec adams-hermes hermes gateway status
docker logs adams-hermes --tail 30
```

Then open Telegram, find your bot, send `/start` or a question like
"what modules does the Adams Platform have?" Hermes should reply.

## Grounding Hermes in platform data

Hermes answers from what it can read, not live Firestore. To give it platform
knowledge:

1. **AdamsBrain sync (per brain):** Portal → Adams Brain → open a brain →
   **Sync to Hermes**. This writes the brain's sources/chunks into the shared
   GBrain volume (`RESOLVER.md`, `HERMES_MEMORY.json`, page files) that Hermes
   reads at `/opt/data/memories/gbrain`.
2. **Repo access:** Hermes clones `bstitt-adams/AdamsHarnessPlatform` into its
   workspace on first boot (needs `GITHUB_TOKEN` in `env/hermes.env`). You can
   ask it about code, or ask it to open a PR — it never edits the live site.
3. **Tell it where to look:** in Telegram you can say e.g. "check
   /opt/data/memories/gbrain for the safety docs" — Hermes has terminal access
   inside its container.

## Deploying to Azure

`env/hermes.env` is the single source for Hermes config in both environments —
`azure/deploy.ps1` turns every key into an ACA secret + env var automatically.

1. Add the same three `TELEGRAM_*` values to `env/hermes.env`.
2. Redeploy:
   ```powershell
   cd C:\Users\BrianStitt\adams-hermes-docker\azure
   .\deploy.ps1
   ```
   (Or add the secrets manually:
   `az containerapp secret set -n adams-platform -g rg-adams-platform --secrets telegram-bot-token=... `
   then set `TELEGRAM_BOT_TOKEN=secretref:telegram-bot-token` etc. on the
   `hermes` container.)
3. Verify: `az containerapp logs show -n adams-platform -g rg-adams-platform --container hermes --tail 50`
   and message the bot.

The app runs **1 replica** on purpose — one Telegram poller, one cron scheduler.
Do not scale out.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Bot never replies | `TELEGRAM_ALLOWED_USERS` empty or wrong ID — check `docker exec adams-hermes hermes gateway status` and `docker logs adams-hermes` |
| `409 Conflict` in logs | Something else is polling the same bot token (e.g. the website webhook bot, or another Hermes). Use a dedicated bot, or run `curl "https://api.telegram.org/bot<TOKEN>/deleteWebhook"` |
| Replies but no platform knowledge | GBrain not synced — run **Sync to Hermes** on the brain, or check `/opt/data/memories/gbrain` inside the container |
| Works locally, not on Azure | Telegram env vars missing from `env/hermes.env` at deploy time — redeploy via `deploy.ps1` |
| Hermes answers but can't use tools | Model credentials missing — see the Hermes README / `hermes auth status anthropic` inside the container |

## Security notes

- **Never commit tokens.** `env/hermes.env`, `.env`, and `env/web.env` are
  git-ignored — keep them that way.
- `TELEGRAM_ALLOWED_USERS` is mandatory: anyone who can message the bot gets an
  agent with terminal access inside the container.
- The bot token grants full control of the bot — treat it like a password.
