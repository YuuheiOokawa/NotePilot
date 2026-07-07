import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultUser } from "@/lib/user";
import { MAX_POSTS_PER_HOUR } from "@/lib/schedule";

export const dynamic = "force-dynamic";

// 投稿キューの取得。
// - queue: 投稿予定日時が設定された未投稿記事（時間帯ごとの件数付き）
// - waitingApproval: 承認待ち（review）
// - approvedUnscheduled: 承認済みだが予定未設定
// - posted: 投稿済み
export async function GET() {
  const user = await getDefaultUser();

  const [scheduled, waitingApproval, approvedUnscheduled, posted] = await Promise.all([
    prisma.noteArticle.findMany({
      where: {
        userId: user.id,
        scheduledAt: { not: null },
        status: { notIn: ["posted", "archived"] },
      },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.noteArticle.findMany({
      where: { userId: user.id, status: "review" },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.noteArticle.findMany({
      where: {
        userId: user.id,
        status: { in: ["approved", "copied"] },
        scheduledAt: null,
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.noteArticle.findMany({
      where: { userId: user.id, status: "posted" },
      orderBy: { postedAt: "desc" },
      take: 30,
    }),
  ]);

  // 時間帯ごとの投稿予定数
  const hourUsage: Record<string, number> = {};
  for (const a of scheduled) {
    if (a.postFrequencyGroup) {
      hourUsage[a.postFrequencyGroup] = (hourUsage[a.postFrequencyGroup] ?? 0) + 1;
    }
  }

  return NextResponse.json({
    queue: scheduled,
    waitingApproval,
    approvedUnscheduled,
    posted,
    hourUsage,
    maxPerHour: MAX_POSTS_PER_HOUR,
  });
}
