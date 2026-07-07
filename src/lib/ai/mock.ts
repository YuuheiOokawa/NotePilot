import type {
  AIProvider,
} from "./index";
import type {
  ArticleRequest,
  GeneratedArticle,
  SalesPlan,
  SalesPlanRequest,
  ThemeRequest,
  ThemeSuggestion,
} from "../types";

// APIキー不要のモック実装。テンプレートから即時生成する。
export class MockProvider implements AIProvider {
  readonly name = "mock";
  readonly model = "mock-v1";

  async generateThemes(req: ThemeRequest): Promise<ThemeSuggestion[]> {
    const base: ThemeSuggestion[] = [
      {
        title: "未経験からITエンジニアに転職して分かった現実と対策",
        description: "転職活動の実体験をもとに、遠回りしないためのロードマップをまとめる。",
        suggestedType: "paid",
        reason: "転職系は購買意欲の高い読者が多く、有料でも売れやすい。",
      },
      {
        title: "資格勉強が続かない人のための「仕組み化」勉強法",
        description: "意志力に頼らず学習を継続するための具体的な仕組みを紹介する。",
        suggestedType: "free",
        reason: "共感を得やすくフォロワー獲得につながる無料記事向きのテーマ。",
      },
      {
        title: "副業note収益化までにやったこと全記録",
        description: "0→1を作るまでの試行錯誤を時系列で公開する。",
        suggestedType: "paid",
        reason: "実績ベースの体験談は有料部分への期待値が高い。",
      },
      {
        title: "30代からのプログラミング学習で失敗しない教材の選び方",
        description: "教材選びの基準と、実際に使ってよかったもの・ダメだったものを紹介。",
        suggestedType: "free",
        reason: "検索需要が安定しており、入口記事として機能する。",
      },
      {
        title: "IT業界の職種図鑑：自分に合うキャリアの見つけ方",
        description: "職種ごとの仕事内容・年収感・向き不向きを整理する。",
        suggestedType: "free",
        reason: "網羅系コンテンツは保存・シェアされやすい。",
      },
      {
        title: "面接で実際に聞かれた質問と回答例50選",
        description: "実体験に基づく質問リストと回答の組み立て方。",
        suggestedType: "paid",
        reason: "具体的なリスト・テンプレは有料コンテンツとして価値が明確。",
      },
    ];
    return base.map((t) => ({
      ...t,
      description: `【${req.category}】${t.description}`,
    }));
  }

  async generateArticle(req: ArticleRequest): Promise<GeneratedArticle> {
    const paid = req.articleType === "paid";
    const tone = req.tone ? `（トーン: ${req.tone}）` : "";
    return {
      title: `${req.theme}｜実体験から本音でまとめました`,
      lead: `「${req.theme}」について、実際に経験して分かったことを整理しました。${tone}この記事では、きれいごと抜きの現実と、遠回りしないための具体的なステップをお伝えします。同じ悩みを持つ方の参考になれば嬉しいです。`,
      sections: [
        {
          heading: "はじめに：この記事で分かること",
          content: `この記事では「${req.theme}」について、次の3点を中心にまとめます。\n\n1. 私が実際に経験したリアルな現実\n2. つまずきやすいポイントとその回避方法\n3. 明日から実践できる具体的なアクション\n\nネットによくある一般論ではなく、実体験に基づいた内容だけを書いています。`,
          isPaid: false,
        },
        {
          heading: "私が直面した現実",
          content: `最初にぶつかったのは、想像と現実のギャップでした。\n\n・情報が多すぎて何から手をつけるべきか分からない\n・SNSで見る成功例と自分の状況が違いすぎる\n・時間をかけたのに成果が出ない\n\nこうした壁は誰もが通る道です。重要なのは「壁の正体」を知っておくことで、事前に知っていれば消耗を大きく減らせます。`,
          isPaid: false,
        },
        {
          heading: paid ? "【ここから有料】具体的なステップ全公開" : "具体的なステップ",
          content: `ここからは、私が実際にやって効果があったステップを順番に解説します。\n\n**ステップ1: 現状の棚卸し**\nまず自分の状況を紙に書き出します。目標・使える時間・リソースを明確にすることで、やるべきことが絞れます。\n\n**ステップ2: 小さく始める**\n完璧な計画より、今日できる最小の行動を優先します。\n\n**ステップ3: 記録と振り返り**\n週1回、うまくいったこと・いかなかったことを記録します。この積み重ねが最短ルートを作ります。`,
          isPaid: paid,
        },
        {
          heading: paid ? "失敗事例と回避策（有料）" : "よくある失敗と回避策",
          content: `私や周囲の実例から、特に多い失敗パターンを3つ紹介します。\n\n**失敗1: 完璧主義で止まる**\n→ 60点で前に進む基準を決めておく。\n\n**失敗2: 比較で消耗する**\n→ 比べる相手は「昨日の自分」だけにする。\n\n**失敗3: 独学にこだわりすぎる**\n→ 人に聞ける環境を最初に作ると速度が段違いになります。`,
          isPaid: paid,
        },
      ],
      summary: `「${req.theme}」で大切なのは、正しい情報を選び、小さく始めて、記録しながら続けることです。この記事が一歩を踏み出すきっかけになれば嬉しいです。`,
      cta: "この記事が役に立ったら、スキ・フォローをお願いします！質問はコメント欄へどうぞ。今後も実体験ベースの記事を発信していきます。",
      hashtags: "#note #副業 #転職 #学習 #キャリア",
      thumbnailText: req.theme.length > 20 ? req.theme.slice(0, 20) : req.theme,
    };
  }

  async generateSalesPlan(req: SalesPlanRequest): Promise<SalesPlan> {
    return {
      price: 500,
      salesTitle: `【実体験】${req.title}`,
      freeScopeNote:
        "導入〜「私が直面した現実」までを無料公開。読者が共感し、続きの具体策を知りたくなる位置で区切るのがおすすめです。",
      paidValueNote:
        "有料部分には、具体的なステップの全手順と失敗事例・回避策を収録。読者が「自分もできる」と思える再現性の高い内容が価値の中心です。",
      targetReader:
        "同じ課題に直面していて、遠回りせずに結果を出したい20〜40代。情報収集はしているが行動に移せていない層。",
      structureAdvice:
        "無料部分で「共感→問題の言語化」を完了させ、有料部分の冒頭に最も価値の高いノウハウを置くと満足度が上がります。目次を無料部分に含めて有料部分の内容を予告しましょう。",
      promoText: `「${req.title}」を公開しました。\n実際に経験したからこそ書ける、きれいごと抜きの内容です。\n無料部分だけでも読んでいってください👇`,
    };
  }
}
