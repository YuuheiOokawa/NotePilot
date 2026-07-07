import { NextResponse } from "next/server";
import { generateAndSaveArticle } from "@/lib/articleService";

export const maxDuration = 60;

// AIで記事を一括生成し、draft（下書き）として保存する。
// 既定で品質チェックまで自動実行する（ユーザーの操作は生成ボタン1回）。
// 投稿・承認は行わない（重要ルールR1/R2）。
export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.theme) {
      return NextResponse.json({ error: "theme は必須です" }, { status: 400 });
    }
    const article = await generateAndSaveArticle({
      theme: body.theme,
      articleType: body.articleType === "paid" ? "paid" : "free",
      tone: body.tone,
      ideaId: body.ideaId,
      seriesItemId: body.seriesItemId,
      autoCheck: body.autoCheck !== false,
    });
    return NextResponse.json(article, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "記事生成に失敗しました" }, { status: 500 });
  }
}
