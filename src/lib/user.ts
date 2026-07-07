import { ensureDbReady } from "./bootstrap";
import { prisma } from "./prisma";

// MVPはシングルユーザー。既定ユーザーがいなければ作成して返す。
export async function getDefaultUser() {
  // 初回アクセス時にスキーマを自動作成する（Vercel単体で動かすため）
  await ensureDbReady();
  const existing = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (existing) return existing;
  return prisma.user.create({ data: { name: "me" } });
}
