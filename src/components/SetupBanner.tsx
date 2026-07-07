"use client";

import { useEffect, useState } from "react";

interface Health {
  ok: boolean;
  db: "ok" | "unconfigured" | "error";
  message?: string;
}

// デプロイ直後のセットアップ案内。
// DBが未設定・接続不能のとき、真っ白な画面やエラーの羅列ではなく
// 「次に何をすればよいか」を画面上部に表示する（Vercel単体運用のため）。
export default function SetupBanner() {
  const [health, setHealth] = useState<Health | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data: Health) => setHealth(data))
      .catch(() => setHealth({ ok: false, db: "error", message: "サーバーに接続できません" }));
  }, []);

  if (!health || health.ok || dismissed) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[90] px-3 pt-3">
      <div className="mx-auto max-w-lg rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 shadow-lg">
        <div className="flex items-start justify-between gap-2">
          <p className="font-bold">🔧 データベースのセットアップが必要です</p>
          <button
            className="shrink-0 rounded px-1 text-amber-700"
            onClick={() => setDismissed(true)}
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>
        {health.db === "unconfigured" ? (
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>
              Vercelのプロジェクトで <b>Storage → Create Database → Neon</b> を追加
              （または Settings → Environment Variables に <code>DATABASE_URL</code> を設定）
            </li>
            <li>再デプロイすると、初回アクセス時にテーブルが自動作成されます</li>
          </ol>
        ) : (
          <p className="mt-2 whitespace-pre-wrap break-all">{health.message}</p>
        )}
        <p className="mt-2 text-xs text-amber-700">
          状態は <code>/api/health</code> で確認できます
        </p>
      </div>
    </div>
  );
}
