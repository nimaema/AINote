# GlaciaNav Notes

Record or upload audio → transcribe with **AssemblyAI** → turn it into a summary,
action items, decisions, and an ask-anything Q&A with **DeepSeek**. Export to
Google Docs or Microsoft Teams. Self-hosted, one Docker stack, served at
`notes.glacianav.com` through a Cloudflare Tunnel.

## Stack

| Layer | Tech |
| --- | --- |
| Web + API | Next.js 15 (App Router, TS), Tailwind v4 |
| Auth | Auth.js (credentials, admin-provisioned, JWT sessions) |
| DB | Postgres + **pgvector**, Drizzle ORM |
| Queue / worker | BullMQ + Redis |
| Storage | MinIO (S3-compatible) |
| Transcription | AssemblyAI (async + webhook) |
| LLM | DeepSeek (`DEEPSEEK_MODEL`, default `deepseek-v4-flash`) |
| Embeddings | `bge-small-en-v1.5` via transformers.js (CPU, in the worker) |
| Tunnel | cloudflared |

Design language: **field recorder** — cold glacial-ink chassis, a single amber
signal readout, one locked dark theme.

## System requirements

No GPU. DeepSeek and AssemblyAI are cloud APIs; the only local ML is bge-small on
CPU. Recommended: **4 vCPU / 8 GB RAM / 40 GB SSD**, Linux + Docker. Floor is 4 GB
RAM. Disk grows mostly with stored audio (~1 MB/min); set a retention policy if it
climbs.

## Local development

```bash
cp .env.example .env          # fill in secrets
npm install
docker run -d --name glacia-pg -e POSTGRES_USER=glacia -e POSTGRES_PASSWORD=devpass \
  -e POSTGRES_DB=glacianotes -p 5432:5432 pgvector/pgvector:pg17
npm run db:generate           # (migrations are committed; only needed after schema edits)
npm run db:migrate            # applies migrations + enables pgvector
npm run db:seed               # creates the admin from ADMIN_EMAIL / ADMIN_PASSWORD
npm run dev                   # app on :3000
npm run worker                # background worker (transcription, LLM, exports)
```

> Node 26 note: `drizzle-kit` needs `drizzle-kit@0.31+` on Node 23+. The Docker
> image uses node:22, where everything works unchanged.

## Production deploy (Docker)

```bash
cp .env.example .env          # set real secrets + CLOUDFLARE_TUNNEL_TOKEN
docker compose build
docker compose run --rm worker npx tsx src/db/migrate.ts   # migrate once
docker compose run --rm worker npx tsx src/db/seed.ts      # seed admin once
docker compose up -d
```

Services: `app`, `worker`, `postgres` (pgvector), `redis`, `minio`, `minio-init`
(creates the audio bucket), `cloudflared`.

### Cloudflare Tunnel → notes.glacianav.com

1. Cloudflare Zero Trust dashboard → **Networks → Tunnels → Create a tunnel**
   (Cloudflared). Copy the tunnel **token** into `CLOUDFLARE_TUNNEL_TOKEN`.
2. Add a **Public Hostname**: `notes.glacianav.com` → service
   `http://app:3000`. Cloudflare creates the DNS record automatically.
3. `docker compose up -d cloudflared`. No inbound ports are opened on the server.

The AssemblyAI webhook is reachable at
`https://notes.glacianav.com/api/webhooks/assemblyai` via the tunnel.

## Accounts

There is **no public signup**. The first admin is seeded from `ADMIN_EMAIL` /
`ADMIN_PASSWORD`. Admins add and manage everyone else from **/admin/users**.

## Environment

See [`.env.example`](.env.example) for the full list with comments.
