import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateAndSaveArticle } from "@/lib/articleService";

export const maxDuration = 60;

// シリーズの「次の未生成項目」を1件生成する（品質チェックまで自動実行）。
// クライアントが残り0になるまで繰り返し呼ぶことで、タイムアウトなしに
// 「一括生成ボタン1つ」で全記事を作成できる。
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const group = await prisma.themeGroup.findUnique({
      where: { id: params.id },
      include: { items: { orderBy: { seriesNumber: "asc" } } },
    });
    if (!group) {
      return NextResponse.json({ error: "テーマグループが見つかりません" }, { status: 404 });
    }

    const total = group.items.length;
    const next = group.items.find((i) => !i.articleId);
    if (!next) {
      return NextResponse.json({ total, done: total, remaining: 0, article: null });
    }

    const article = await generateAndSaveArticle({
      theme: `${next.title}\n${next.description}`,
      articleType: next.role === "paid" ? "paid" : "free",
      seriesItemId: next.id,
      autoCheck: true,
    });

    const done = group.items.filter((i) => i.articleId).length + 1;
    return NextResponse.json({
      total,
      done,
      remaining: total - done,
      article: { id: article.id, title: article.title, seriesNumber: next.seriesNumber },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "記事の生成に失敗しました" }, { status: 500 });
  }
}
