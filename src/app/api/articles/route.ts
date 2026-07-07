import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultUser } from "@/lib/user";
import { isStatus } from "@/lib/workflow";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const type = searchParams.get("type");

  const user = await getDefaultUser();
  const articles = await prisma.noteArticle.findMany({
    where: {
      userId: user.id,
      ...(status && isStatus(status) ? { status } : {}),
      ...(type === "free" || type === "paid" ? { articleType: type } : {}),
    },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { sections: true, revenueLogs: true } } },
  });
  return NextResponse.json(articles);
}
