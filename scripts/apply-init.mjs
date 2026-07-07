// prisma/init.sql をNeonに適用するスクリプト。
// prisma db push が使えないネットワーク（5432遮断・TLS傍受）でも
// Neonサーバーレスドライバ（WebSocket/443）経由でテーブルを作成できる。
// 使い方: DATABASE_URL を .env に設定した上で `npm run db:init`
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// .env から DATABASE_URL を読む（dotenv非依存の簡易パース）
if (!process.env.DATABASE_URL) {
  try {
    const env = readFileSync(join(root, ".env"), "utf8");
    const m = env.match(/^DATABASE_URL\s*=\s*"?([^"\r\n]+)"?/m);
    if (m) process.env.DATABASE_URL = m[1];
  } catch {}
}
const databaseUrl =
  process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL が設定されていません（.env を確認してください）");
  process.exit(1);
}

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: databaseUrl });
const sql = readFileSync(join(root, "prisma", "init.sql"), "utf8");

const client = await pool.connect();
try {
  const existing = await client.query(
    "SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='public'",
  );
  console.log("既存テーブル数:", existing.rows[0].n);
  if (existing.rows[0].n > 0) {
    console.log("テーブルが既に存在するため作成をスキップします");
  } else {
    await client.query(sql); // 複数ステートメントを一括実行
    console.log("init.sql 実行完了");
  }
  const after = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name",
  );
  console.log("テーブル一覧:", after.rows.map((r) => r.table_name).join(", "));
} finally {
  client.release();
  await pool.end();
}
