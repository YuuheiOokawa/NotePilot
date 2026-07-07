import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultUser } from "@/lib/user";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getDefaultUser();
  const groups = await prisma.themeGroup.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      items: { orderBy: { seriesNumber: "asc" } },
      _count: { select: { articles: true } },
    },
  });
  return NextResponse.json(groups);
}

// シリーズ計画（ユーザーが確認・編集済み）を保存してテーマグループを作成する
export async function POST(req: Request) {
  const body = await req.json();
  if (!body.name || !Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: "name と items は必須です" }, { status: 400 });
  }
  const user = await getDefaultUser();
  const group = await prisma.themeGroup.create({
    data: {
      userId: user.id,
      name: body.name,
      description: body.description ?? "",
      items: {
        create: body.items.map(
          (
            item: {
              seriesNumber?: number;
              title: string;
              description?: string;
              role?: string;
              suggestedPrice?: number | null;
            },
            i: number,
          ) => ({
            seriesNumber: item.seriesNumber ?? i + 1,
            title: item.title,
            description: item.description ?? "",
            role: ["free", "paid", "summary", "promo"].includes(item.role ?? "")
              ? (item.role as "free" | "paid" | "summary" | "promo")
              : "free",
            suggestedPrice: item.suggestedPrice ?? null,
          }),
        ),
      },
    },
    include: { items: { orderBy: { seriesNumber: "asc" } } },
  });
  return NextResponse.json(group, { status: 201 });
}
