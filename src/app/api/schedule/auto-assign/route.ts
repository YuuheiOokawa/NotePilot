import { NextResponse } from "next/server";
import { autoAssignSchedules } from "@/lib/autoAssign";
import { getDefaultUser } from "@/lib/user";

// 承認済み（approved/copied）で投稿予定が未設定の記事に、
// 翌日以降の空き時間帯（JST 9〜21時、1時間1件で分散）を自動割当する。
// あくまで予定の割当のみで、実際の投稿はユーザーが手動で行う。
export async function POST() {
  const user = await getDefaultUser();
  const updated = await autoAssignSchedules(user.id);
  return NextResponse.json({ assigned: updated.length, articles: updated });
}
