// Runs the Prisma CLI against Neon's direct (non-pooler) host. Usage: pnpm db:direct migrate deploy
import "dotenv/config";
import { spawnSync } from "node:child_process";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set in .env");
const result = spawnSync(
  "./node_modules/.bin/prisma",
  [...process.argv.slice(2), "--config", "prisma7.config.ts"],
  { stdio: "inherit", env: { ...process.env, DATABASE_URL: url.replace("-pooler.", ".") } },
);
process.exit(result.status ?? 1);
