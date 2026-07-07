// DB接続文字列の解決。
// Vercelの統合（Neon / Vercel Postgres など）は DATABASE_URL 以外の名前で
// 接続文字列を設定することがあるため、代表的な変数名にフォールバックする。
export function resolveDatabaseUrl(): string | undefined {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL ||
    undefined
  );
}

export function isDatabaseConfigured(): boolean {
  return Boolean(resolveDatabaseUrl());
}

// DATABASE_URL 未設定を「設定ミス」として明示的に扱うためのエラー
export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super(
      "DATABASE_URL が設定されていません。Vercelの場合は Settings > Environment Variables に Neon の接続文字列を設定して再デプロイしてください。",
    );
    this.name = "DatabaseNotConfiguredError";
  }
}
