import { NextResponse } from "next/server";
import { ensureDbReady } from "@/lib/bootstrap";
import { isDatabaseConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

// デプロイ状態の確認用エンドポイント。
// DB接続文字列の有無・スキーマ初期化の成否・AIプロバイダ設定を返す。
export async function GET() {
  const aiProvider =
    process.env.AI_PROVIDER === "anthropic" && process.env.ANTHROPIC_API_KEY
      ? "anthropic"
      : "mock";

  if (!isDatabaseConfigured()) {
    return NextResponse.json({
      ok: false,
      db: "unconfigured",
      message:
        "DATABASE_URL が未設定です。Vercelの Settings > Environment Variables に Neon の接続文字列を設定して再デプロイしてください（Vercel Marketplace の Neon 統合を追加すると自動設定されます）。",
      aiProvider,
    });
  }

  try {
    await ensureDbReady();
    return NextResponse.json({ ok: true, db: "ok", aiProvider });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      db: "error",
      message: `DBに接続できませんでした: ${err instanceof Error ? err.message : String(err)}`,
      aiProvider,
    });
  }
}
