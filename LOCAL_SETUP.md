# Running GOGETTER Car Advisor

This guide covers running the GOGETTER AI Used Car Advisor locally and deploying it to **Vercel**.

The app is a **Vite + React 19** single-page frontend and a **tRPC 11** API. In production the API runs as a **Vercel serverless function** (`api/trpc/[trpc].ts`); locally the same router runs under a small **Express** dev server for hot reload. Data lives in **Postgres** (Neon serverless recommended) via **Drizzle ORM**. Authentication is a self-signed JWT session cookie with a built-in **admin / admin** demo login — no third-party identity provider.

What works with zero external services (besides the database):

- The **admin / admin** demo login (signs its own session JWT).
- **VIN decode** via the free public **NHTSA vPIC API** (needs internet).
- **Find My Car**, **New Cars** + **trim configurator**, **Compare**, scoring, seller types, **Contact seller** templates, **Garage** with the **price-drop tracker** and **saved-search alerts**.
- The **AI Advisor**, per-car narratives, and "Personalize with AI" gracefully fall back to deterministic text when no LLM endpoint is configured.

---

## 1. Prerequisites

| Tool | Version | Notes |
| --- | --- | --- |
| **Node.js** | 20+ (22 recommended) | `node -v` |
| **pnpm** | 9+ | `npm i -g pnpm` |
| **Postgres** | — | A [Neon](https://neon.tech) serverless database (free tier is fine), or any Postgres 14+ reachable by URL. |

---

## 2. Install dependencies

```bash
pnpm install
```

---

## 3. Configure environment variables

```bash
cp .env.local.example .env
```

Then fill in `.env`:

| Variable | Required? | What it does |
| --- | --- | --- |
| `DATABASE_URL` | **Yes** | Postgres connection string. For Neon use the pooled (`-pooler`) host, e.g. `postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require`. |
| `JWT_SECRET` | **Yes** | Long random string signing the session cookie. Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. |
| `PORT` | No | Local dev port (default `3000`). Ignored on Vercel. |
| `LLM_API_URL` | No (LLM) | Base URL of an OpenAI-compatible endpoint (`/v1/chat/completions` is appended). Enables AI advisor/narratives/personalize. |
| `LLM_API_KEY` | No (LLM) | Bearer token for the LLM endpoint. |
| `LLM_MODEL` | No (LLM) | Model name your endpoint serves (e.g. `gpt-4o-mini`). |
| `CRON_SECRET` | No | Guards `POST /api/cron/monitor`. Set it in Vercel and the cron sends it automatically. |
| `OWNER_OPEN_ID` | No | Auto-promote a user (e.g. `demo_admin`) to admin. |

> Simplest run: set only `DATABASE_URL` and `JWT_SECRET`. Everything except live AI prose works.

### LLM (optional)

The advisor and the "why we picked this" narratives call an **OpenAI-compatible** chat-completions endpoint via `server/_core/llm.ts`.

- OpenAI: `LLM_API_URL=https://api.openai.com`, `LLM_API_KEY=sk-...`, `LLM_MODEL=gpt-4o-mini`.
- Any compatible gateway (OpenRouter, a local proxy, Gemini's OpenAI-compatible endpoint): point the three vars at it.
- Leave them blank and the app still runs — advisor/narratives fall back to deterministic text built from the decoded specs and score.

---

## 4. Create the database schema

With `DATABASE_URL` set to an empty database:

```bash
pnpm db:push
```

This runs `drizzle-kit generate && drizzle-kit migrate` and creates `users`, `search_history`, `saved_vehicles`, `seller_inquiries`, `price_history`, `saved_searches`, and `notifications`.

---

## 5. Run locally

```bash
pnpm dev
```

Open **http://localhost:3000**. You'll land on the video-background **login** page — sign in with:

```
username: admin
password: admin
```

To exercise the monitor (price-drop + new-match alerts) on demand:

```bash
curl -X POST http://localhost:3000/api/cron/monitor
```

Save a car or a Find-My-Car search first, then run it — you'll see alerts in the navbar bell.

---

## 6. Try it out

1. **Lookup** — paste a real VIN (e.g. `1HGCM82633A004352`) and decode it via NHTSA.
2. **Find My Car** — set budget, ZIP, condition, seller types and priorities → ranked shortlist with per-car narratives. **Contact seller**, save matches, or **Save this search** for alerts.
3. **New Cars** — browse by reputation, then **Configure & price** a trim (options update price/MSRP/score live).
4. **Garage** — see saved cars with the **price-drop** indicator + sparkline, and manage **search alerts**.
5. **Compare** — decode/compare up to three VINs side by side.

---

## 7. Deploy to Vercel

The repo ships a `vercel.json` (build, SPA rewrites, function config, and the monitor cron).

1. Push the repo to GitHub and **Import** it in Vercel (framework preset: *Other*).
2. **Environment Variables** — add `DATABASE_URL`, `JWT_SECRET`, optionally `LLM_API_URL`/`LLM_API_KEY`/`LLM_MODEL`, and `CRON_SECRET`.
3. Run `pnpm db:push` once against the production `DATABASE_URL` (locally with that URL, or via the Neon SQL editor) to create the tables.
4. Deploy. Vercel builds the SPA (`vite build` → `dist/public`) and the `api/**` serverless functions automatically.
5. **Cron cadence:** `vercel.json` schedules `/api/cron/monitor` daily (`0 9 * * *`) — Vercel **Hobby** allows once-daily crons. On **Pro**, change it to `0 */6 * * *` for every 6 hours.

---

## 8. Useful scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the local dev server (Express + Vite HMR). |
| `pnpm build` | Production client build (Vite → `dist/public`). |
| `pnpm build:all` | Client build + standalone server bundle (for non-Vercel hosting). |
| `pnpm check` | TypeScript type-check (no emit). |
| `pnpm test` | Run the Vitest suite. |
| `pnpm db:push` | Generate + apply Drizzle migrations. |
| `pnpm db:studio` | Open Drizzle Studio against your database. |

---

## 9. Swapping in real listings

All inventory access goes through one provider boundary (`server/inventory/provider.ts`, interface in `server/inventory/types.ts`); the seeded dataset (`server/inventory/data.json`) loads behind it. To go live with a real listings API, implement `InventoryProvider` (`getInventory`, `getListingById`, `getListingByVin`) — the matching engine, scoring, configurator, price-drop monitor, and UI all consume the same `Listing` shape unchanged. Map authentic dealer photo URLs with `source: "dealer"` and the **"Dealer photos"** badge lights up automatically.

---

## 10. Notes & limitations

- **Seeded inventory is static.** The price-drop monitor applies a small, clearly-labeled market simulation so the feature is demonstrable; a real listings provider makes it track genuine changes.
- **Seeded VINs are synthetic** and served from the local inventory adapter (not NHTSA). Real user-entered VINs decode live via vPIC.
- **The premium tier (Carfax/CarGurus) is a teaser only** — no paid history APIs are integrated.
