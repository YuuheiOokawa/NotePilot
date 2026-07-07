"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";

interface Setting {
  profile: string;
  genres: string;
  tone: string;
  aiProvider: string;
  aiModel: string;
  noteAccountUrl: string;
}

export default function SettingsPage() {
  const [setting, setSetting] = useState<Setting | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then(setSetting);
  }, []);

  const save = async () => {
    if (!setting) return;
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(setting),
      });
      if (!res.ok) throw new Error();
      setMessage("保存しました");
    } catch {
      setMessage("保存に失敗しました");
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(""), 2500);
    }
  };

  if (!setting) {
    return (
      <>
        <Header title="設定" backHref="/" />
        <p className="py-8 text-center text-xs text-gray-400">読み込み中...</p>
      </>
    );
  }

  return (
    <>
      <Header title="設定" backHref="/" />
      <main className="space-y-4 p-4">
        <div className="card space-y-3">
          <h2 className="text-xs font-bold text-gray-500">noteアカウント連携</h2>
          <div>
            <label className="label">自分のnoteプロフィールURL</label>
            <input
              className="input"
              placeholder="https://note.com/xxxx"
              value={setting.noteAccountUrl}
              onChange={(e) => setSetting({ ...setting, noteAccountUrl: e.target.value })}
            />
          </div>
          {setting.noteAccountUrl && (
            <a
              href={setting.noteAccountUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-xl border border-note py-2.5 text-center text-xs font-bold text-note-dark active:bg-note/10"
            >
              📝 自分のnoteページを開く
            </a>
          )}
          <p className="text-[10px] text-gray-400">
            ※ 保存するのは公開プロフィールURLのみです。noteのログインID・パスワードは入力・保存しません（自動ログイン・自動投稿は行いません）。
          </p>
        </div>

        <div className="card space-y-3">
          <h2 className="text-xs font-bold text-gray-500">プロフィール（AI生成に反映されます）</h2>
          <div>
            <label className="label">経験・得意分野</label>
            <textarea
              className="input min-h-[100px]"
              placeholder="例: SIer5年→Web系転職。基本情報・応用情報保持。副業でブログ運営。"
              value={setting.profile}
              onChange={(e) => setSetting({ ...setting, profile: e.target.value })}
            />
          </div>
          <div>
            <label className="label">発信ジャンル</label>
            <input
              className="input"
              placeholder="例: IT転職、資格勉強、副業"
              value={setting.genres}
              onChange={(e) => setSetting({ ...setting, genres: e.target.value })}
            />
          </div>
          <div>
            <label className="label">文体の好み</label>
            <input
              className="input"
              placeholder="例: 親しみやすく、ですます調"
              value={setting.tone}
              onChange={(e) => setSetting({ ...setting, tone: e.target.value })}
            />
          </div>
        </div>

        <div className="card space-y-3">
          <h2 className="text-xs font-bold text-gray-500">AI設定</h2>
          <div>
            <label className="label">AIプロバイダ</label>
            <select
              className="input"
              value={setting.aiProvider}
              onChange={(e) => setSetting({ ...setting, aiProvider: e.target.value })}
            >
              <option value="mock">モック（APIキー不要・お試し用）</option>
              <option value="anthropic">Claude API</option>
            </select>
            <p className="mt-1 text-[10px] text-gray-400">
              実際の切り替えはサーバーの環境変数 AI_PROVIDER / ANTHROPIC_API_KEY で行います（この項目はメモです）
            </p>
          </div>
          <div>
            <label className="label">AIモデル</label>
            <input
              className="input"
              value={setting.aiModel}
              onChange={(e) => setSetting({ ...setting, aiModel: e.target.value })}
            />
          </div>
        </div>

        <button className="btn-primary" onClick={save} disabled={saving}>
          {saving ? "保存中..." : "設定を保存"}
        </button>
        {message && <p className="text-center text-xs font-bold text-note-dark">{message}</p>}

        <div className="card">
          <h2 className="mb-2 text-xs font-bold text-gray-500">このアプリについて</h2>
          <ul className="space-y-1 text-[11px] text-gray-500">
            <li>・AIは記事の下書きを作るだけです。投稿・価格設定は必ずあなたの承認後に行われます。</li>
            <li>・noteへの自動投稿は行いません。コピー＆ペーストで投稿してください。</li>
            <li>・売上・価格はアプリ内メモであり、noteとは連携していません。</li>
          </ul>
        </div>
      </main>
    </>
  );
}
