# 05. API設計

Next.js App Router の Route Handlers（`src/app/api/**/route.ts`）。認証はMVPでは省略（既定ユーザー）。レスポンスはJSON。

## テーマ提案

| メソッド | パス | 内容 |
|---|---|---|
| POST | `/api/generate/themes` | AIテーマ提案。body: `{ category }` → `ThemeSuggestion[]`（保存はしない） |
| GET | `/api/ideas` | 保存済みアイデア一覧 |
| POST | `/api/ideas` | アイデア保存。body: `{ title, description, category, suggestedType }` |
| DELETE | `/api/ideas/[id]` | アイデア削除 |

## 記事生成・管理

| メソッド | パス | 内容 |
|---|---|---|
| POST | `/api/generate/article` | AI記事一括生成＋draft記事として保存。body: `{ theme, articleType, tone, ideaId? }` → 作成された記事 |
| POST | `/api/generate/sales` | AI販売設計提案。body: `{ articleId }` → SalesPlan（保存はしない） |
| GET | `/api/articles?status=&type=` | 記事一覧（絞り込み対応） |
| GET | `/api/articles/[id]` | 記事詳細（sections, approvalRequests, revenueLogs含む） |
| PATCH | `/api/articles/[id]` | 記事の基本要素・販売設定・セクションの更新 |
| DELETE | `/api/articles/[id]` | 物理削除（通常はarchived遷移を使用） |

## ステータス遷移（承認ワークフロー）

| メソッド | パス | 内容 |
|---|---|---|
| POST | `/api/articles/[id]/status` | body: `{ to, comment? }`。`lib/workflow.ts` の遷移表で検証し、不正遷移は409。`draft→review` で approval_requests 作成、`review→approved/draft` で解決を記録、`approved→copied` はコピー時に自動、`copied→posted` はユーザー記録 |

- **遷移ガード**: 許可された遷移以外は `409 { error: "invalid transition" }`
- approved / posted への遷移はこのエンドポイント（＝ユーザー操作）のみ。AI生成側から呼ばれることはない（R1/R2）

## 売上メモ

| メソッド | パス | 内容 |
|---|---|---|
| GET | `/api/revenues` | 全売上（記事情報含む）＋合計 |
| POST | `/api/articles/[id]/revenues` | 売上記録追加。body: `{ date, count, amount, memo? }` |
| DELETE | `/api/revenues/[id]` | 売上記録削除 |

## 設定

| メソッド | パス | 内容 |
|---|---|---|
| GET | `/api/settings` | 設定取得（なければ既定値で作成） |
| PUT | `/api/settings` | 設定更新 |

## AI抽象化層（`src/lib/ai/`）

```ts
interface AIProvider {
  generateThemes(req: ThemeRequest): Promise<ThemeSuggestion[]>;
  generateArticle(req: ArticleRequest): Promise<GeneratedArticle>;
  generateSalesPlan(req: SalesPlanRequest): Promise<SalesPlan>;
}
```

- `AI_PROVIDER=mock`（既定）: 決め打ちテンプレートで即時生成。APIキー不要で全機能が動作
- `AI_PROVIDER=anthropic`: `@anthropic-ai/sdk` 経由でClaude（既定モデル `claude-opus-4-8`）を呼び出し
- 生成の入出力は `ai_generation_logs` に記録
