import { prisma } from "./prisma";

// MVPはシングルユーザー。既定ユーザーがいなければ作成して返す。
export async function getDefaultUser() {
  const existing = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (existing) return existing;
  return prisma.user.create({ data: { name: "me" } });
}
