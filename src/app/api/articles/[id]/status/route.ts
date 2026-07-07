import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canTransition, isStatus } from "@/lib/workflow";
import { canApprove } from "@/lib/review";

// ステータス遷移エンドポイント。
// 遷移表（lib/workflow.ts）にない遷移は409で拒否する。
// approved / posted への遷移はこのエンドポイント＝ユーザーの明示操作からのみ発生する（重要ルールR2）。
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const to: string = body.to;

  if (!isStatus(to)) {
    return NextResponse.json({ error: "不正なステータスです" }, { status: 400 });
  }

  const article = await prisma.noteArticle.findUnique({ where: { id: params.id } });
  if (!article) {
    return NextResponse.json({ error: "記事が見つかりません" }, { status: 404 });
  }

  const from = article.status;
  if (!canTransition(from, to)) {
    return NextResponse.json(
      { error: `「${from}」から「${to}」への遷移は許可されていません` },
      { status: 409 },
    );
  }

  // 承認ガード: 品質チェック未実施・未確認情報が残っている記事は承認（＝投稿可能な状態）にできない
  if (to === "approved" && !canApprove(article.publishReadinessStatus, article.hasUnverifiedClaims)) {
    const reason = article.hasUnverifiedClaims
      ? "未確認情報（要確認リスト）が残っています。すべて確認済みにしてから承認してください。"
      : "品質チェックが完了していないか、要修正項目が残っています。品質チェックを実行し、問題を解消してください。";
    return NextResponse.json({ error: `承認できません: ${reason}` }, { status: 409 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    // 承認ワークフローの記録
    if (from === "draft" && to === "review") {
      await tx.approvalRequest.create({
        data: { articleId: article.id, status: "pending" },
      });
    }
    if (from === "review" && (to === "approved" || to === "draft")) {
      const pending = await tx.approvalRequest.findFirst({
        where: { articleId: article.id, status: "pending" },
        orderBy: { requestedAt: "desc" },
      });
      if (pending) {
        await tx.approvalRequest.update({
          where: { id: pending.id },
          data: {
            status: to === "approved" ? "approved" : "rejected",
            comment: body.comment || null,
            resolvedAt: new Date(),
          },
        });
      }
    }

    return tx.noteArticle.update({
      where: { id: article.id },
      data: {
        status: to,
        ...(to === "posted" ? { postedAt: new Date(), noteUrl: body.noteUrl || article.noteUrl } : {}),
      },
    });
  });

  return NextResponse.json(updated);
}
