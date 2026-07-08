import { NextResponse } from "next/server";
import { AutoFixError, runAutoFix } from "@/lib/autoFix";

export const maxDuration = 60;

// チェック指摘(誤字脱字・文法・表現・重複)のAI自動修正。
// 実行後に品質チェックを自動で再実行する。承認・投稿には進めない。
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const result = await runAutoFix(params.id);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof AutoFixError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    console.error("auto fix failed:", e);
    return NextResponse.json({ error: "自動修正に失敗しました" }, { status: 500 });
  }
}
