import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const group = await prisma.themeGroup.findUnique({
    where: { id: params.id },
    include: {
      items: {
        orderBy: { seriesNumber: "asc" },
        include: {
          article: {
            select: { id: true, status: true, publishReadinessStatus: true, scheduledAt: true },
          },
        },
      },
    },
  });
  if (!group) {
    return NextResponse.json({ error: "テーマグループが見つかりません" }, { status: 404 });
  }
  return NextResponse.json(group);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    // 記事本体は残し、シリーズとの紐付けだけ解除する
    await prisma.noteArticle.updateMany({
      where: { themeGroupId: params.id },
      data: { themeGroupId: null, seriesNumber: null, seriesRole: null },
    });
    await prisma.themeGroup.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "テーマグループが見つかりません" }, { status: 404 });
  }
}
