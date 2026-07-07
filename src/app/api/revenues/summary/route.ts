import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { summarizeRevenues } from "@/lib/revenue";
import { getDefaultUser } from "@/lib/user";

// DBアクセスするためビルド時の静的化を無効にする
export const dynamic = "force-dynamic";

// 売上分析サマリー（累計・今月/先月・月別推移・記事別ランキング）
export async function GET() {
  const user = await getDefaultUser();
  const logs = await prisma.revenueLog.findMany({
    where: { article: { userId: user.id } },
    include: { article: { select: { id: true, title: true, articleType: true } } },
  });
  const summary = summarizeRevenues(
    logs.map((l) => ({
      date: l.date,
      count: l.count,
      amount: l.amount,
      articleId: l.article.id,
      articleTitle: l.article.title,
      articleType: l.article.articleType,
    })),
    new Date(),
  );
  return NextResponse.json(summary);
}
