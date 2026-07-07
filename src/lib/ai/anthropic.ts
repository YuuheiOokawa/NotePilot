import Anthropic from "@anthropic-ai/sdk";
import type { AIProvider } from "./index";
import type {
  ArticleRequest,
  GeneratedArticle,
  SalesPlan,
  SalesPlanRequest,
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
}
