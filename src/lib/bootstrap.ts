// DBスキーマの自動初期化。
// 「Vercel上だけで動く」ことを最優先し、ローカルからの `prisma db push` を不要にする。
// 初回アクセス時に users テーブルの有無を確認し、なければ init.sql を実行する。
// 複数のサーバーレスインスタンスが同時に走っても壊れないよう advisory lock で直列化する。
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { DatabaseNotConfiguredError, resolveDatabaseUrl } from "./db";
import { INIT_SQL } from "./init-sql";

neonConfig.webSocketConstructor = ws;

// スキーマ初期化用の advisory lock キー（アプリ固有の任意の定数）
const INIT_LOCK_KEY = 728105;

const globalForBootstrap = globalThis as unknown as { dbReady?: Promise<void> };

// インスタンスごとに1回だけスキーマ確認・初期化を行う。
// 失敗時はキャッシュを破棄し、次のリクエストで再試行できるようにする。
export function ensureDbReady(): Promise<void> {
  if (!globalForBootstrap.dbReady) {
    globalForBootstrap.dbReady = initSchemaIfNeeded().catch((err) => {
      globalForBootstrap.dbReady = undefined;
      throw err;
    });
  }
  return globalForBootstrap.dbReady;
}

async function initSchemaIfNeeded(): Promise<void> {
  const url = resolveDatabaseUrl();
  if (!url) throw new DatabaseNotConfiguredError();

  const pool = new Pool({ connectionString: url });
  try {
    const client = await pool.connect();
    try {
      if (await schemaExists(client)) return;
      await client.query(`SELECT pg_advisory_lock(${INIT_LOCK_KEY})`);
      try {
        // ロック待ちの間に他インスタンスが初期化した可能性があるので再確認
        if (await schemaExists(client)) return;
        await client.query(INIT_SQL);
      } finally {
        await client.query(`SELECT pg_advisory_unlock(${INIT_LOCK_KEY})`);
      }
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

async function schemaExists(client: {
  query: (sql: string) => Promise<{ rows: { ready?: boolean }[] }>;
}): Promise<boolean> {
  const res = await client.query("SELECT to_regclass('public.users') IS NOT NULL AS ready");
  return Boolean(res.rows[0]?.ready);
}
