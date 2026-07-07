# 07. MVP実装計画

## フェーズ

| フェーズ | 内容 | 成果物 |
|---|---|---|
| P1 基盤 | プロジェクト設定・Prismaスキーマ・lib（prisma/user/workflow/types）・AI抽象化層（mock） | ビルド可能な骨格 |
| P2 API | ideas / generate / articles / status / revenues / settings の全Route Handler | API一式 |
| P3 UI | 10画面＋共通コンポーネント・下部ナビ・スマホファーストUI | 全画面 |
| P4 PWA | manifest.json・アイコン・メタ設定 | ホーム画面追加対応 |
| P5 テスト | workflow遷移ガードのユニットテスト（vitest） | `npm test` |
| P6 ドキュメント | README（セットアップ・環境変数・使い方） | README.md |

## MVPで実装するもの / しないもの

- ✅ テーマ提案 / 記事生成（無料・有料）/ 記事一覧・詳細 / 承認ワークフロー / コピー用プレビュー / 売上メモ / 設定 / モックAI / Claude API接続（キー設定時のみ）
- ❌ note API連携（設計上の予約フィールドのみ）/ 認証 / 画像生成 / 売上分析 / 定期投稿

## セットアップ手順（実装完了後にユーザーが実行）

```bash
cd note-auto-creator
npm install
cp .env.example .env   # DATABASE_URL を設定（Supabase接続文字列）
npx prisma db push     # スキーマ反映
npm run dev            # http://localhost:3000
```

- AIはデフォルトでモック動作（APIキー不要）。実AI利用時は `.env` に `AI_PROVIDER=anthropic` と `ANTHROPIC_API_KEY` を設定。
