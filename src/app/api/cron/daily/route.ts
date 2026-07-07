import { NextResponse } from "next/server";
import { generateAndSaveArticle } from "@/lib/articleService";
import { autoAssignSchedules } from "@/lib/autoAssign";
import { prisma } from "@/lib/prisma";
import { getDefaultUser } from "@/lib/user";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// maxDuration(60秒)内に必ず収まるよう、生成はこの時間を超えたら打ち切る
const TIME_BUDGET_MS = 40_000;

// 毎日の自動バッチ（vercel.json の crons から呼ばれる。手動実行も可）。
// 1. シリーズの未生成記事を最大 CRON_GENERATE_LIMIT 件生成（品質チェックまで自動）
// 2. 承認済み・予定未設定の記事へ投稿スケジュールを自動割当
// 承認・実投稿は従来どおりユーザー操作（勝手に投稿しない方針は変えない）。
export async function GET(req: Request) {
  // CRON_SECRET を設定している場合は Authorization ヘッダを検証する
  // （Vercelは環境変数 CRON_SECRET があるとCronリクエストに自動で付与する）
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const user = await getDefaultUser();
    const limit = Math.max(0, Number(process.env.CRON_GENERATE_LIMIT ?? 3) || 0);
    const startedAt = Date.now();

    // 1. 未生成のシリーズ記事を生成
    const pending = await prisma.seriesItem.findMany({
      where: { articleId: null, themeGroup: { userId: user.id } },
      orderBy: [{ themeGroupId: "asc" }, { seriesNumber: "asc" }],
      take: limit,
    });

    const generated: { id: string; title: string }[] = [];
    const errors: string[] = [];
    for (const item of pending) {
      if (Date.now() - startedAt > TIME_BUDGET_MS) break;
      try {
        const article = await generateAndSaveArticle({
          theme: `${item.title}\n${item.description}`,
          articleType: item.role === "paid" ? "paid" : "free",
          seriesItemId: item.id,
          autoCheck: true,
        });
        generated.push({ id: article.id, title: article.title });
      } catch (e) {
        console.error("cron: 記事生成に失敗", item.id, e);
        errors.push(`生成失敗: ${item.title}`);
      }
    }

    // 2. 承認済み記事へ投稿予定を自動割当
    const assigned = await autoAssignSchedules(user.id);

    return NextResponse.json({
      ok: true,
      generated: generated.map((g) => g.title),
      generatedCount: generated.length,
      assignedCount: assigned.length,
      pendingRemaining: pending.length - generated.length,
      errors,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "バッチ実行に失敗しました" }, { status: 500 });
  }
}
