## Bot Environment Notes

Tournament website webhook sync uses:

- `TOURNAMENT_WEBHOOK_URL` (expected endpoint path: `/api/webhooks/tournament`)
- `TOURNAMENT_WEBHOOK_SECRET` (sent as `X-Webhook-Secret`)

If `TOURNAMENT_WEBHOOK_URL` still points to `/api/tournament/update`, the bot will normalize it to `/api/webhooks/tournament` at runtime and log a warning once.


## Branding and Discord setup configuration

Phase 1 Murph Tournaments branding is controlled with optional environment variables.
All values are safe defaults and no secrets should be committed.

- `BOT_DISPLAY_NAME` - visible bot/community name. Defaults to `Murph Tournaments`.
- `/register` and the `/bracket` registration menu link to the active tournament page on the Murph Tournaments website when a tournament instance is in registration-ready status.
- `TEAM_SETUP_AUDIT_REASON_PREFIX` - prefix used in Discord audit-log reasons for team role/channel setup. Defaults to `Murph Tournaments team setup`.
- `TEAM_VOICE_CATEGORY_NAME` - optional generic voice category name fallback used when no community-specific mapping matches.
- `COMMUNITY_VOICE_CATEGORY_MAP` - optional JSON object mapping a registration source/community label to a Discord voice category name. Example: `{"Murph Tournament Community":"Team Channels","7th Circle":"7th Circle Division"}`.

Category resolution order is:

1. `COMMUNITY_VOICE_CATEGORY_MAP` entry for the source/community label.
2. `TEAM_VOICE_CATEGORY_NAME`.
3. Legacy compatibility aliases below.
4. Existing hard-coded legacy fallbacks for currently stored community labels.

Legacy compatibility aliases retained for existing deployments:

- `MY_DIVISION_VOICE_CATEGORY_NAME` - legacy alias for the existing `Murph Tournament Community` source/community label. If unset, that legacy label still falls back to `Murphs Division`.
- `SEVENTH_CIRCLE_DIVISION_VOICE_CATEGORY_NAME` - legacy alias for the existing `7th Circle` source/community label. If unset, that legacy label still falls back to `7th Circle Division`.

Do not rename existing source keys such as `dd_registration` or `7th-circle`; they are kept for stored sync state compatibility.

## Prisma setup for panel lifecycle models

### Why Prisma `P3005` happens in this repo

`prisma migrate deploy` expects migration history in `_prisma_migrations`.

In this repo, many local bot databases were created before migration history was introduced (for example via older `prisma db push` usage). Those SQLite files already contain application tables, so Prisma sees a non-empty schema with no applied migration history and throws `P3005` (`The database schema is not empty`).

### Migration layout in this repo

- `prisma/migrations/20260413_000000_baseline` is the baseline snapshot of the pre-panel schema.
- `prisma/migrations/20260413_panel_lifecycle` adds:
  - `ActivePanelMessage`
  - `SavedPanelContext`

### Safe baseline + migrate workflow (existing SQLite DB)

Run from repository root in **Windows PowerShell**:

1. (Optional but recommended) inspect current DB target and tables:

   ```powershell
   $env:DATABASE_URL = "file:./dev.db"
   node -e "const Database=require('better-sqlite3');const db=new Database('dev.db');const rows=db.prepare(\"SELECT name FROM sqlite_master WHERE type='table' ORDER BY name\").all();console.table(rows);"
   ```

2. Mark the baseline migration as already applied for this existing DB (no data changes):

   ```powershell
   npm run prisma:baseline
   ```

3. Apply pending migrations (this creates panel lifecycle tables if missing):

   ```powershell
   npm run prisma:migrate:deploy
   ```

4. Regenerate Prisma client:

   ```powershell
   npm run prisma:generate
   ```

Or run step 3 and 4 together:

```powershell
npm run prisma:migrate:local
```

### New/fresh database workflow

For a brand new SQLite file (empty DB), just run:

```powershell
npm run prisma:migrate:local
```

Prisma will execute the baseline migration SQL, then `20260413_panel_lifecycle`, and generate the client.

### Applying future migrations safely

1. Create migration in development (`prisma migrate dev ...`).
2. Commit the new migration directory.
3. On existing environments, apply with `npm run prisma:migrate:deploy` (baseline only once per legacy DB).
4. Regenerate client with `npm run prisma:generate`.

### Database path resolution

- The bot and Prisma CLI resolve SQLite `DATABASE_URL` values relative to the repository root.
- If `DATABASE_URL` is unset, both use: `file:<repo-root>/dev.db`.
- On startup the bot logs the resolved datasource path under `[db] Prisma datasource resolved` so you can confirm the exact file.
