import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultUser } from "@/lib/user";
import { findOpenSlots, hourKey } from "@/lib/schedule";

// 承認済み（approved/copied）で投稿予定が未設定の記事に、
// 翌日以降の空き時間帯（JST 9〜21時、1時間1件で分散）を自動割当する。
// あくまで予定の割当のみで、実際の投稿はユーザーが手動で行う。
export async function POST() {
  const user = await getDefaultUser();

  const targets = await prisma.noteArticle.findMany({
    where: {
      userId: user.id,
      status: { in: ["approved", "copied"] },
      scheduledAt: null,
    },
    orderBy: [{ seriesNumber: "asc" }, { updatedAt: "asc" }],
  });

  if (targets.length === 0) {
    return NextResponse.json({ assigned: 0, articles: [] });
  }

  // 既存予定の時間バケツを使用済みとして扱う
  const existing = await prisma.noteArticle.findMany({
    where: { postFrequencyGroup: { not: null }, status: { notIn: ["posted", "archived"] } },
    select: { postFrequencyGroup: true },
  });
  const usedKeys = new Set<string>(existing.map((a) => a.postFrequencyGroup as string));

  const slots = findOpenSlots(new Date(), targets.length, usedKeys);

  const updated: { id: string; title: string; scheduledAt: Date }[] = [];
  for (let i = 0; i < targets.length && i < slots.length; i++) {
    const a = await prisma.noteArticle.update({
      where: { id: targets[i].id },
      data: { scheduledAt: slots[i], postFrequencyGroup: hourKey(slots[i]) },
    });
    updated.push({ id: a.id, title: a.title, scheduledAt: a.scheduledAt as Date });
  }

  return NextResponse.json({ assigned: updated.length, articles: updated });
}
