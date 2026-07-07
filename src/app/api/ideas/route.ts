import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultUser } from "@/lib/user";

// DBアクセスするためビルド時の静的化を無効にする
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getDefaultUser();
  const ideas = await prisma.articleIdea.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(ideas);
}

export async function POST(req: Request) {
  const body = await req.json();
  if (!body.title) {
    return NextResponse.json({ error: "title は必須です" }, { status: 400 });
  }
  const user = await getDefaultUser();
  const idea = await prisma.articleIdea.create({
    data: {
      userId: user.id,
      title: body.title,
      description: body.description ?? "",
      category: body.category ?? "",
      suggestedType: body.suggestedType === "paid" ? "paid" : "free",
    },
  });
  return NextResponse.json(idea, { status: 201 });
}
