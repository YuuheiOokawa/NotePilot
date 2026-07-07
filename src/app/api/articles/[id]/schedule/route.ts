import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canScheduleInHour, hourKey, MAX_POSTS_PER_HOUR } from "@/lib/schedule";

// 投稿予定日時の設定。1時間あたり最大3投稿までの管理を行う。
// これはスケジュール管理上の目安であり、実際の投稿はユーザーが承認後に手動で行う。
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const article = await prisma.noteArticle.findUnique({ where: { id: params.id } });
  if (!article) {
    return NextResponse.json({ error: "記事が見つかりません" }, { status: 404 });
  }

  // scheduledAt: null でスケジュール解除
  if (body.scheduledAt === null) {
    const updated = await prisma.noteArticle.update({
      where: { id: params.id },
      data: { scheduledAt: null, postFrequencyGroup: null },
    });
    return NextResponse.json(updated);
  }

  const scheduledAt = new Date(body.scheduledAt);
  if (isNaN(scheduledAt.getTime())) {
    return NextResponse.json({ error: "日時の形式が不正です" }, { status: 400 });
  }

  const group = hourKey(scheduledAt);
  const countInSameHour = await prisma.noteArticle.count({
    where: { postFrequencyGroup: group, id: { not: params.id } },
  });
  if (!canScheduleInHour(countInSameHour)) {
    return NextResponse.json(
      {
        error: `この時間帯（${group}時台）はすでに${MAX_POSTS_PER_HOUR}件の投稿予定があります。別の時間帯を選んでください。`,
      },
      { status: 409 },
    );
  }

  const updated = await prisma.noteArticle.update({
    where: { id: params.id },
    data: { scheduledAt, postFrequencyGroup: group },
  });
  return NextResponse.json(updated);
}
