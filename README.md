# Murph Tournaments Discord Bot

## Railway production deployment

The production Discord bot entry point is `apps/bot/index.ts`. The production build compiles it to `dist/apps/bot/index.js`, and Railway must start that compiled file instead of `/app/index.js`.

Railway should use these commands:

- **Build Command:** `npm run build:railway`
- **Start Command:** `npm run start:railway`

`npm run build:railway` runs Prisma Client generation and then TypeScript compilation. `npm run start:railway` applies pending Prisma migrations with `prisma migrate deploy` and starts the compiled Discord bot with Node. Production must not use `npm run dev` or `ts-node-dev`.

This repository includes `nixpacks.toml` so Railway/Nixpacks installs dependencies with `npm install`, builds with `npm run build:railway`, and starts with `npm run start:railway`.

### Railway database configuration

The current Prisma datasource is SQLite. A Railway deploy using SQLite must attach a persistent volume; otherwise the SQLite database file will be stored on the ephemeral application filesystem and can be lost across redeploys or restarts.

Recommended Railway SQLite environment variable when a volume is mounted at `/data`:

```sh
DATABASE_URL=file:/data/dev.db
```

Do not point this bot at a Railway MySQL service unless the Prisma datasource provider, migrations, and runtime adapter are intentionally changed from SQLite to MySQL in a separate schema migration. With the current schema and `@prisma/adapter-better-sqlite3` runtime, Railway should use a persistent SQLite volume.
