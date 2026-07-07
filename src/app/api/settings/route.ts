import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultUser } from "@/lib/user";

// DBアクセスするためビルド時の静的化を無効にする
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getDefaultUser();
  let setting = await prisma.setting.findUnique({ where: { userId: user.id } });
  if (!setting) {
    setting = await prisma.setting.create({ data: { userId: user.id } });
  }
  return NextResponse.json(setting);
}

export async function PUT(req: Request) {
  const body = await req.json();
  const user = await getDefaultUser();
  const setting = await prisma.setting.upsert({
    where: { userId: user.id },
    update: {
      profile: body.profile ?? "",
      genres: body.genres ?? "",
      tone: body.tone ?? "",
      aiProvider: body.aiProvider ?? "mock",
      aiModel: body.aiModel ?? "claude-opus-4-8",
    },
    create: {
      userId: user.id,
      profile: body.profile ?? "",
      genres: body.genres ?? "",
      tone: body.tone ?? "",
      aiProvider: body.aiProvider ?? "mock",
      aiModel: body.aiModel ?? "claude-opus-4-8",
    },
  });
  return NextResponse.json(setting);
}
