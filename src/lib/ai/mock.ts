import type {
  AIProvider,
} from "./index";
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
  SuspectedClaim,
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

  // 推奨配分: 無料6〜7本 / 有料2〜3本 / まとめ1本（＋宣伝1本）
  async generateSeriesPlan(req: SeriesPlanRequest): Promise<SeriesPlanItem[]> {
    const t = req.theme;
    const plan: SeriesPlanItem[] = [
      { seriesNumber: 1, title: `${t}を始める前に知っておくべき全体像`, description: "シリーズ導入。読者の悩みを言語化して信頼を作る。", role: "free" },
      { seriesNumber: 2, title: `${t}でみんながつまずく3つの壁`, description: "共感を得る失敗談ベースの無料記事。", role: "free" },
      { seriesNumber: 3, title: `${t}の最初の一歩：今日やるべきこと`, description: "小さく始められる具体アクションを無料で提供。", role: "free" },
      { seriesNumber: 4, title: `${t}に必要な時間とお金のリアル`, description: "現実的なコスト感を共有して信頼を積む。", role: "free" },
      { seriesNumber: 5, title: `【有料】${t} 完全ロードマップ＆チェックリスト`, description: "手順書＋チェックリスト。シリーズの中核となる有料記事。", role: "paid", suggestedPrice: 980 },
      { seriesNumber: 6, title: `${t}でよくある質問に全部答える`, description: "Q&A形式の無料記事。検索流入を狙う。", role: "free" },
      { seriesNumber: 7, title: `${t}を継続するための仕組み化テクニック`, description: "継続ノウハウの無料記事。", role: "free" },
      { seriesNumber: 8, title: `【有料】${t} 実例テンプレート集（コピペOK）`, description: "実際に使えるテンプレートを配布する有料記事。", role: "paid", suggestedPrice: 500 },
      { seriesNumber: 9, title: `${t}シリーズ全記事まとめ｜読む順番ガイド`, description: "シリーズ全体の導線となるまとめ記事。", role: "summary" },
      { seriesNumber: 10, title: `${t}の有料noteに込めた内容を紹介します`, description: "有料記事の価値を伝える宣伝用記事。", role: "promo" },
    ];
    return plan.slice(0, req.count && req.count >= 4 ? req.count : 10);
  }

  // SNS宣伝文を3パターン生成する（X向け・140字目安）
  async generateSnsPromo(req: SnsPromoRequest): Promise<SnsPromoVariant[]> {
    const paid = req.articleType === "paid";
    const priceNote = paid && req.price ? `（¥${req.price}）` : "";
    const tags = (req.hashtags || "").split(/\s+/).filter(Boolean).slice(0, 2).join(" ");
    const url = req.noteUrl ? `\n${req.noteUrl}` : "";
    const suffix = `${tags ? `\n${tags}` : ""}${url}`;

    return [
      {
        label: "共感型",
        text: `「${req.title}」を書きました。\n同じことで悩んでいた過去の自分に向けて、実体験ベースでまとめています。${paid ? `\n無料部分だけでも読んでいってください👇${priceNote}` : "\nよかったら読んでみてください👇"}${suffix}`,
      },
      {
        label: "問いかけ型",
        text: `${req.title.replace(/[。｜|].*$/, "")}、気になりませんか？\n私が実際に経験して分かったことを1本のnoteにまとめました。${paid ? `\n具体的な手順は有料部分に全部書いています${priceNote}👇` : "\n答えはこちら👇"}${suffix}`,
      },
      {
        label: "価値訴求型",
        text: `✅実体験ベース\n✅きれいごと抜き\n✅明日から使える具体策\n\n「${req.title}」公開しました${priceNote}👇${suffix}`,
      },
    ];
  }

  // ルールベースの自動修正。reviewArticleが検出する誤字・誇大表現を機械的に置換する。
  // 事実情報(数値・料金・制度)には触れない。重複の解消は文脈判断が必要なため対象外。
  async fixArticle(req: AutoFixRequest): Promise<AutoFixResult> {
    const changeNotes: string[] = [];

    // 誤字パターン(reviewArticleのtypoPatternsと対応)
    const typoFixes: [RegExp, string, string][] = [
      [/のの/g, "の", "助詞の重複「のの」を「の」に修正"],
      [/がが/g, "が", "助詞の重複「がが」を「が」に修正"],
      [/をを/g, "を", "助詞の重複「をを」を「を」に修正"],
      [/です。です/g, "です", "文末の重複「です。です」を修正"],
      [/ます。ます/g, "ます", "文末の重複「ます。ます」を修正"],
      [/ {2,}/g, " ", "連続した半角スペースを1つに修正"],
    ];

    // 誇大表現の言い換え(reviewArticleのexaggerationPatternsと対応)。長い語句から先に置換する
    const softenFixes: [string, string][] = [
      ["誰でも簡単に稼げる", "初心者でも取り組みやすい"],
      ["必ず稼げる", "収入につながる可能性がある"],
      ["確実に稼げる", "収益が見込める"],
      ["失敗しません", "失敗しにくくなります"],
      ["保証します", "と考えています"],
      ["間違いなく", "おそらく"],
      ["絶対に", "できる限り"],
      ["100%", "ほぼ"],
    ];

    const applied = new Set<string>();
    const fix = (text: string): string => {
      let result = text;
      for (const [re, replacement, note] of typoFixes) {
        re.lastIndex = 0;
        if (re.test(result)) {
          result = result.replace(re, replacement);
          applied.add(note);
        }
      }
      for (const [pattern, replacement] of softenFixes) {
        if (result.includes(pattern)) {
          result = result.split(pattern).join(replacement);
          applied.add(`誇大表現「${pattern}」を「${replacement}」に言い換え`);
        }
      }
      return result;
    };

    const lead = fix(req.lead);
    const sections = req.sections.map((s) => ({
      heading: fix(s.heading),
      content: fix(s.content),
      isPaid: s.isPaid, // 有料境界は変更しない
    }));
    const summary = fix(req.summary);

    changeNotes.push(...Array.from(applied));
    if (req.issues.duplicationIssues.length > 0) {
      changeNotes.push(
        "内容の重複は文脈の判断が必要なため自動修正していません。手動で調整してください。",
      );
    }
    if (changeNotes.length === 0) {
      changeNotes.push("自動修正できる箇所は見つかりませんでした。");
    }

    return { lead, sections, summary, changeNotes };
  }

  // ルールベースの品質チェック。誇大表現・要確認情報などを機械的に検出する。
  async reviewArticle(req: QualityReviewRequest): Promise<QualityReview> {
    const fullText = [
      req.lead,
      ...req.sections.map((s) => `${s.heading}\n${s.content}`),
      req.summary,
    ].join("\n");

    // 誇大表現・断定表現の検出
    const exaggerationPatterns = [
      "絶対に",
      "必ず稼げる",
      "確実に稼げる",
      "100%",
      "誰でも簡単に稼げる",
      "保証します",
      "間違いなく",
      "失敗しません",
    ];
    const expressionIssues = exaggerationPatterns
      .filter((p) => fullText.includes(p))
      .map((p) => `誇大・断定表現「${p}」が含まれています。表現を和らげるか根拠を示してください。`);

    // 誤字パターンの簡易検出
    const typoPatterns: [RegExp, string][] = [
      [/のの/g, "「のの」（助詞の重複）"],
      [/がが/g, "「がが」（助詞の重複）"],
      [/をを/g, "「をを」（助詞の重複）"],
      [/です。です/g, "「です。です」（文末の重複）"],
      [/ます。ます/g, "「ます。ます」（文末の重複）"],
      [/  +/g, "連続した半角スペース"],
    ];
    const typoIssues = typoPatterns
      .filter(([re]) => re.test(fullText))
      .map(([, label]) => `${label} が見つかりました。`);

    // 内容の重複検出（同一の長い行が複数セクションに出現）
    const lineMap = new Map<string, number>();
    for (const s of req.sections) {
      const seen = new Set<string>();
      for (const line of s.content.split("\n")) {
        const trimmed = line.trim();
        if (trimmed.length < 15 || seen.has(trimmed)) continue;
        seen.add(trimmed);
        lineMap.set(trimmed, (lineMap.get(trimmed) ?? 0) + 1);
      }
    }
    const duplicationIssues = Array.from(lineMap.entries())
      .filter(([, count]) => count >= 2)
      .slice(0, 5)
      .map(([line]) => `複数セクションで同じ文が使われています: 「${line.slice(0, 30)}...」`);

    // タイトルと本文の一致（タイトルの主要語が本文に登場するか）
    const titleTokens = req.title
      .split(/[｜|【】「」\s:：・,、。!！?？]+/)
      .filter((w) => w.length >= 3);
    const matched = titleTokens.some((w) => fullText.includes(w));
    const titleMatch = {
      ok: titleTokens.length === 0 || matched,
      note: matched
        ? "タイトルの主要キーワードが本文に含まれています。"
        : "タイトルの主要キーワードが本文にほとんど登場しません。タイトルか本文の見直しを検討してください。",
    };

    // 無料/有料の切り分けチェック
    let paidSplit = { ok: true, note: "無料記事のため切り分けチェックは対象外です。" };
    if (req.articleType === "paid") {
      const freeCount = req.sections.filter((s) => !s.isPaid).length;
      const paidCount = req.sections.filter((s) => s.isPaid).length;
      const firstPaidIndex = req.sections.findIndex((s) => s.isPaid);
      const freeAfterPaid =
        firstPaidIndex >= 0 && req.sections.slice(firstPaidIndex).some((s) => !s.isPaid);
      if (paidCount === 0) {
        paidSplit = { ok: false, note: "有料記事ですが有料セクションがありません。" };
      } else if (freeCount === 0) {
        paidSplit = { ok: false, note: "無料公開部分がありません。読者獲得のため冒頭は無料にしましょう。" };
      } else if (freeAfterPaid) {
        paidSplit = { ok: false, note: "有料セクションの後に無料セクションがあります。境界を整理してください。" };
      } else {
        paidSplit = { ok: true, note: `無料${freeCount}セクション→有料${paidCount}セクションの構成です。` };
      }
    }

    // 要確認情報の抽出（数値・料金・試験・法律・制度など、断定を避けて確認対象にする）
    const claims: SuspectedClaim[] = [];
    const claimRules: [RegExp, string][] = [
      [/[0-9０-９,，]+(円|万円|億円)/g, "料金・金額"],
      [/[0-9０-９.]+(%|％|割)/g, "数値・割合"],
      [/(合格率|受験料|試験時間|出題数|問題数|試験日)/g, "試験情報"],
      [/(法律|法改正|条例|規約|制度|税制|確定申告|控除)/g, "法律・制度"],
      [/[0-9０-９]+(年|ヶ月|か月|時間)(で|以内|かかる)/g, "期間・数値"],
    ];
    const sentences = fullText.split(/[。\n]/).filter((s) => s.trim().length > 0);
    for (const sentence of sentences) {
      for (const [re, category] of claimRules) {
        re.lastIndex = 0;
        if (re.test(sentence)) {
          if (!claims.some((c) => c.text === sentence.trim())) {
            claims.push({
              text: sentence.trim().slice(0, 120),
              category,
              reason: `${category}に関する記述です。正確性を確認するまで「要確認」として扱ってください。`,
            });
          }
          break;
        }
      }
      if (claims.length >= 10) break;
    }

    const grammarIssues: string[] = [];

    const suggestions: string[] = [];
    if (expressionIssues.length > 0) suggestions.push("誇大表現を「〜と感じました」「私の場合は〜でした」など体験ベースの表現に変更しましょう。");
    if (claims.length > 0) suggestions.push("数値・制度・料金などの情報は公式サイトで確認し、出典を明記するか「※最新情報は公式でご確認ください」を添えましょう。");
    if (!titleMatch.ok) suggestions.push("タイトルで約束した内容が本文で回収されているか確認しましょう。");
    if (req.articleType === "paid" && paidSplit.ok) suggestions.push("有料部分の冒頭に最も価値の高い情報を置くと購入者満足度が上がります。");
    if (suggestions.length === 0) suggestions.push("大きな問題は見つかりませんでした。音読して読みやすさを最終確認しましょう。");

    const deductions =
      typoIssues.length * 5 +
      grammarIssues.length * 5 +
      expressionIssues.length * 8 +
      duplicationIssues.length * 5 +
      (titleMatch.ok ? 0 : 10) +
      (paidSplit.ok ? 0 : 10) +
      Math.min(claims.length * 3, 15);
    const score = Math.max(0, Math.min(100, 100 - deductions));

    return {
      score,
      typoIssues,
      grammarIssues,
      expressionIssues,
      duplicationIssues,
      titleMatch,
      paidSplit,
      valueAssessment:
        req.articleType === "paid"
          ? "有料記事は具体的な手順・テンプレート・チェックリスト・実体験が価値の中心です。無料記事との差が明確か確認してください。"
          : "無料記事は信頼獲得が目的です。出し惜しみせず、読者の役に立つ内容になっているか確認してください。",
      claims,
      suggestions,
    };
  }
}
