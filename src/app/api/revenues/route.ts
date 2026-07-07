import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultUser } from "@/lib/user";

// DBアクセスするためビルド時の静的化を無効にする
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getDefaultUser();
  const logs = await prisma.revenueLog.findMany({
    where: { article: { userId: user.id } },
    orderBy: { date: "desc" },
    include: { article: { select: { id: true, title: true, articleType: true } } },
  });
  const totalAmount = logs.reduce((sum, l) => sum + l.amount, 0);
  const totalCount = logs.reduce((sum, l) => sum + l.count, 0);
  return NextResponse.json({ logs, totalAmount, totalCount });
}
