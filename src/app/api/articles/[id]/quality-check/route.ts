import { NextResponse } from "next/server";
import { runQualityCheck } from "@/lib/quality";

export const maxDuration = 60;

// 品質チェック＋ファクトチェックを実行する（共通処理は lib/quality.ts）。
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const result = await runQualityCheck(params.id);
    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    const message = e instanceof Error && e.message === "記事が見つかりません" ? e.message : "品質チェックに失敗しました";
    const status = message === "記事が見つかりません" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
