# JKRLZ Personal XO — Command Center

Private founder command center for JKRLZ LLC. Runs 100% offline, no cloud dependencies, no authentication required.

## Quick Start

```bash
npm install
npm run dev
```

Opens at: **http://localhost:3000**

The SQLite database is created automatically at `data/personal_xo.db` on first run and seeded with sample data.

## Modules

| Module | Route | Description |
|--------|-------|-------------|
| 🏠 Today Command Brief | `/` | Daily ops overview, critical items, top 3 actions |
| 💰 Money Radar | `/money` | Income, expenses, net balance, subscription burn |
| 📥 Decision Inbox | `/decisions` | Prioritized decision queue with AI recommendations |
| 📊 Project Radar | `/projects` | All projects — status, blockers, owners |
| 🔧 Subscription Audit | `/subscriptions` | Tool stack ROI analysis, sorted lowest-first |
| 🔔 Alerts Center | `/alerts` | Critical/high/normal alerts with resolve actions |
| 📋 Daily Brief | `/brief` | Auto-generated command brief from DB state |

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **better-sqlite3** — local SQLite at `data/personal_xo.db`
- **No external APIs** — fully offline
- **No authentication** — localhost only

## Database

SQLite database at `data/personal_xo.db`. Seed data loads automatically on first run.

To re-seed from scratch: delete `data/personal_xo.db` and restart the server.

---

## SPOF Mitigation & Backup

This app runs entirely locally. There is no cloud dependency.

**If laptop is unavailable:**
- All data is in SQLite at `data/personal_xo.db` — copy to backup location
- Weekly backup target: `G:\My Drive\Cloud Cowork\JKRLZ_LLC_COMPANY_OS\DIVISIONS\D0_PERSONAL_XO\REPORTS\backup\`
- Backup command: `copy data\personal_xo.db "G:\My Drive\Cloud Cowork\JKRLZ_LLC_COMPANY_OS\DIVISIONS\D0_PERSONAL_XO\REPORTS\backup\"`

**To restart on a new machine:**
1. `npm install`
2. `npm run dev`
3. If `personal_xo.db` exists from backup, place in `data/` folder
4. If not, seed data will be recreated automatically

No accounts. No API keys. No external services.

---

*JKRLZ LLC Company OS — Mission Card PERSONALXO-MVP-LOCAL-01*
