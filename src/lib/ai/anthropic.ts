import Anthropic from "@anthropic-ai/sdk";
import type { AIProvider } from "./index";
import type {
  ArticleRequest,
  AutoFixRequest,
  AutoFixResult,
  GeneratedArticle,
  QualityReview,
  QualityReviewRequest,
  SalesPlan,
  SalesPlanRequest,
  SeriesPlanItem,
  SeriesPlanRequest,
  SnsPromoRequest,
  SnsPromoVariant,
  ThemeRequest,
  ThemeSuggestion,
} from "../types";

const DEFAULT_MODEL = "claude-opus-4-8";

// Claude API実装。ANTHROPIC_API_KEY が必要。
export class AnthropicProvider implements AIProvider {
  readonly name = "anthropic";
  readonly model: string;
  private client: Anthropic;

  constructor() {
    this.model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
    this.client = new Anthropic();
  }

  private async completeJson<T>(system: string, user: string): Promise<T> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 16000,
      system,
      messages: [{ role: "user", content: user }],
    });
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    // コードフェンス付きで返ることがあるため除去してからパース
    const jsonText = text.replace(/^```(?:json)?\s*/m, "").replace(/```\s*$/m, "").trim();
    return JSON.parse(jsonText) as T;
  }

  async generateThemes(req: ThemeRequest): Promise<ThemeSuggestion[]> {
    const system =
      "あなたはnote記事のマーケティング専門家です。必ず指定されたJSON形式のみで回答してください。";
    const user = `noteで公開する記事のテーマを6件提案してください。
カテゴリ: ${req.category}
執筆者プロフィール: ${req.profile || "未設定"}
発信ジャンル: ${req.genres || "IT・転職・資格・副業・学習"}

以下のJSON配列のみを出力してください:
[{"title": "テーマ名", "description": "内容の説明", "suggestedType": "free または paid", "reason": "そのテーマを提案する理由"}]`;
    return this.completeJson<ThemeSuggestion[]>(system, user);
  }

  async generateArticle(req: ArticleRequest): Promise<GeneratedArticle> {
    const system =
      "あなたはnoteで人気のライターです。読者の共感を得る実体験ベースの記事を書きます。必ず指定されたJSON形式のみで回答してください。";
    const user = `以下の条件でnote記事を作成してください。
テーマ: ${req.theme}
記事種別: ${req.articleType === "paid" ? "有料記事（後半セクションを isPaid: true にする）" : "無料記事（全セクション isPaid: false）"}
文体・トーン: ${req.tone || "親しみやすく誠実"}
執筆者プロフィール: ${req.profile || "未設定"}

セクションは4〜6個。有料記事の場合は前半2つを無料、残りを有料にしてください。
以下のJSONのみを出力してください:
{"title": "タイトル", "lead": "導入文(200字程度)", "sections": [{"heading": "見出し", "content": "本文(改行は\\n)", "isPaid": false}], "summary": "まとめ", "cta": "CTA文", "hashtags": "#タグ1 #タグ2 ...", "thumbnailText": "サムネイル文言(20字以内)"}`;
    return this.completeJson<GeneratedArticle>(system, user);
  }

  async generateSalesPlan(req: SalesPlanRequest): Promise<SalesPlan> {
    const system =
      "あなたはnote有料記事の販売戦略コンサルタントです。必ず指定されたJSON形式のみで回答してください。";
    const user = `以下のnote記事の販売設計を提案してください。
タイトル: ${req.title}
導入文: ${req.lead}
目次: ${req.sectionHeadings.join(" / ")}

以下のJSONのみを出力してください:
{"price": 500, "salesTitle": "販売用タイトル", "freeScopeNote": "無料公開範囲の提案", "paidValueNote": "有料部分の価値訴求", "targetReader": "読者ターゲット", "structureAdvice": "購入されやすい構成のアドバイス", "promoText": "SNS宣伝文"}`;
    return this.completeJson<SalesPlan>(system, user);
  }

  async generateSeriesPlan(req: SeriesPlanRequest): Promise<SeriesPlanItem[]> {
    const count = req.count && req.count >= 4 ? req.count : 10;
    const system =
      "あなたはnoteの連載企画のプロです。必ず指定されたJSON形式のみで回答してください。";
    const user = `テーマ「${req.theme}」でnote記事シリーズ（${count}本）を企画してください。
執筆者プロフィール: ${req.profile || "未設定"}

配分ルール:
- 無料記事(role: "free"): 6〜7本（信頼獲得重視。読者獲得用）
- 有料記事(role: "paid"): 2〜3本（具体的な手順・テンプレート・チェックリスト・実体験。suggestedPriceに100円以上の推奨価格）
- まとめ記事(role: "summary"): 1本（シリーズ全体の導線）
- 宣伝用記事(role: "promo"): 1本（有料noteへの導線）
- 同じ内容の記事を量産しない。各記事の切り口を明確に分ける

以下のJSON配列のみを出力してください:
[{"seriesNumber": 1, "title": "記事タイトル", "description": "内容の説明", "role": "free", "suggestedPrice": null}]`;
    return this.completeJson<SeriesPlanItem[]>(system, user);
  }

  async generateSnsPromo(req: SnsPromoRequest): Promise<SnsPromoVariant[]> {
    const system =
      "あなたはSNSマーケティングの専門家です。誇大表現を避け、誠実で共感を得る文章を書きます。必ず指定されたJSON形式のみで回答してください。";
    const user = `以下のnote記事のSNS宣伝文（X向け・140字目安）を3パターン作成してください。
タイトル: ${req.title}
導入文: ${req.lead}
種別: ${req.articleType === "paid" ? `有料記事${req.price ? `（¥${req.price}）` : ""}` : "無料記事"}
ハッシュタグ候補: ${req.hashtags || "なし"}
記事URL: ${req.noteUrl || "未投稿（URLは含めない）"}

ルール:
- 「絶対」「必ず稼げる」などの誇大表現は使わない
- 3パターンは切り口を変える（共感型 / 問いかけ型 / 価値訴求型 など）
- 記事URLがある場合は文末に含める。ハッシュタグは1〜2個まで

以下のJSON配列のみを出力してください:
[{"label": "共感型", "text": "宣伝文"}]`;
    return this.completeJson<SnsPromoVariant[]>(system, user);
  }

  async fixArticle(req: AutoFixRequest): Promise<AutoFixResult> {
    const system = `あなたはnote記事の校閲者です。品質チェックで指摘された問題だけを最小限の修正で直します。必ず指定されたJSON形式のみで回答してください。
ルール:
- 修正するのは誤字脱字・文法ミス・不自然/誇大な表現・内容の重複のみ
- 数値・料金・法律・制度などの事実情報は絶対に変更しない(事実確認はユーザーが行う)
- セクションの数・順序・isPaidは絶対に変更しない。見出しは誤字がある場合のみ修正
- 指摘と関係ない箇所は書き換えない。文体・内容・構成は維持する
- changeNotesに「どこを・どう直したか」を1件ずつ日本語で記載する`;
    const body = req.sections
      .map((s, i) => `[セクション${i + 1}]${s.isPaid ? "【有料】" : "【無料】"}${s.heading}\n${s.content}`)
      .join("\n\n");
    const issueList = [
      ...req.issues.typoIssues.map((s) => `誤字脱字: ${s}`),
      ...req.issues.grammarIssues.map((s) => `文法: ${s}`),
      ...req.issues.expressionIssues.map((s) => `表現: ${s}`),
      ...req.issues.duplicationIssues.map((s) => `重複: ${s}`),
    ].join("\n");
    const user = `以下のnote記事について、品質チェックの指摘を修正してください。
タイトル: ${req.title}
種別: ${req.articleType === "paid" ? "有料記事" : "無料記事"}

指摘一覧:
${issueList}

導入文: ${req.lead}
本文:
${body}
まとめ: ${req.summary}

セクション数は${req.sections.length}個のまま、元と同じ順序・同じisPaidで出力してください。
以下のJSONのみを出力してください:
{"lead": "修正後の導入文", "sections": [{"heading": "見出し", "content": "修正後の本文(改行は\\n)", "isPaid": false}], "summary": "修正後のまとめ", "changeNotes": ["修正内容の説明"]}`;
    return this.completeJson<AutoFixResult>(system, user);
  }

  async reviewArticle(req: QualityReviewRequest): Promise<QualityReview> {
    const system = `あなたはnote記事の校閲・ファクトチェック担当です。必ず指定されたJSON形式のみで回答してください。
方針:
- 断定表現・誇大表現を検出する
- 数値・法律・制度・試験情報・料金などは正しさを保証できないため、すべて claims（要確認情報）として列挙する
- 嘘や未確認情報をそのまま通さない`;
    const body = req.sections
      .map((s) => `${s.isPaid ? "【有料】" : "【無料】"}${s.heading}\n${s.content}`)
      .join("\n\n");
    const user = `以下のnote記事を品質チェックしてください。
タイトル: ${req.title}
種別: ${req.articleType === "paid" ? "有料記事" : "無料記事"}
導入文: ${req.lead}
本文:
${body}
まとめ: ${req.summary}

チェック項目: 誤字脱字 / 文法ミス / 表現の不自然さ / 内容の重複 / タイトルと本文の一致 / 無料・有料の切り分け / 読者価値 / 誇大表現 / 未確認情報 / 出典が必要な情報

以下のJSONのみを出力してください:
{"score": 0-100の品質スコア, "typoIssues": ["誤字脱字の指摘"], "grammarIssues": ["文法ミスの指摘"], "expressionIssues": ["不自然・誇大表現の指摘"], "duplicationIssues": ["重複の指摘"], "titleMatch": {"ok": true, "note": "所見"}, "paidSplit": {"ok": true, "note": "所見"}, "valueAssessment": "読者価値の評価", "claims": [{"text": "要確認の記述", "category": "数値/法律・制度/試験情報/料金など", "reason": "確認が必要な理由"}], "suggestions": ["改善提案"]}`;
    return this.completeJson<QualityReview>(system, user);
  }
}
