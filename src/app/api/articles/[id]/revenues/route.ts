import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const article = await prisma.noteArticle.findUnique({ where: { id: params.id } });
  if (!article) {
    return NextResponse.json({ error: "記事が見つかりません" }, { status: 404 });
  }
  if (!body.date || body.amount === undefined) {
    return NextResponse.json({ error: "date と amount は必須です" }, { status: 400 });
  }
  const log = await prisma.revenueLog.create({
    data: {
      articleId: params.id,
      date: new Date(body.date),
      count: Number(body.count ?? 1),
      amount: Number(body.amount),
      memo: body.memo || null,
    },
  });
  return NextResponse.json(log, { status: 201 });
}
