// note自動投稿ランナー（ローカルPC専用）
//
// 動作:
//  - DBを監視し「承認済み(approved) かつ 投稿予定時刻を過ぎた」記事だけを処理する
//    → 承認していない記事は絶対に投稿されない（承認制は維持）
//  - 無料記事: noteに自動入力して公開まで実行 → status=posted に更新
//  - 有料記事: 下書き投入まで自動 → status=copied に更新
//    （価格設定・有料ライン・公開クリックはユーザーが手動 = 価格設定は必ずユーザー）
//  - 1時間3件上限・投稿間隔90秒をランナー側でも強制
//
// 認証:
//  - パスワードは保存しない。初回起動時にブラウザが開くので手動ログインする。
//    ログイン状態は .note-profile/ (gitignore済み) に保持される。
//
// 使い方:
//  npm run poster          # 常駐監視（60秒ごとにチェック）
//  npm run poster:once     # 期限が来ている記事を処理して終了
//  --draft-only を付けると無料記事も下書き投入まで（公開しない）お試しモード
//
// 注意: noteのUI自動操作は利用規約に抵触する可能性・アカウント制限のリスクがあります。
//       ユーザーがこのリスクを理解した上で有効化しています（docs/10参照）。

import { chromium } from "playwright";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { readFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PROFILE_DIR = join(root, ".note-profile");
const LOG_DIR = join(root, "poster-logs");
mkdirSync(LOG_DIR, { recursive: true });

const ONCE = process.argv.includes("--once");
const DRAFT_ONLY = process.argv.includes("--draft-only");
const POLL_MS = 60_000;
const MIN_GAP_MS = 90_000;
const MAX_PER_HOUR = 3;

// ---- DB ----
if (!process.env.DATABASE_URL) {
  const env = readFileSync(join(root, ".env"), "utf8");
  const m = env.match(/^DATABASE_URL\s*=\s*"?([^"\r\n]+)"?/m);
  if (m) process.env.DATABASE_URL = m[1];
}
neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const log = (...a) => console.log(new Date().toLocaleTimeString("ja-JP"), ...a);

async function dueArticles() {
  const { rows } = await pool.query(
    `SELECT id, title, article_type, hashtags, lead, summary, cta, scheduled_at
       FROM note_articles
      WHERE status = 'approved'
        AND has_unverified_claims = false
        AND scheduled_at IS NOT NULL
        AND scheduled_at <= now()
      ORDER BY scheduled_at ASC`,
  );
  return rows;
}

async function postedInLastHour() {
  const { rows } = await pool.query(
    `SELECT count(*)::int AS n FROM note_articles WHERE posted_at > now() - interval '1 hour'`,
  );
  return rows[0].n;
}

async function sectionsOf(articleId) {
  const { rows } = await pool.query(
    `SELECT heading, content, is_paid FROM article_sections
      WHERE article_id = $1 ORDER BY order_index ASC`,
    [articleId],
  );
  return rows;
}

function buildBody(article, sections) {
  const parts = [article.lead];
  for (const s of sections) parts.push(`${s.heading}\n\n${s.content}`);
  parts.push(`${article.summary}\n\n${article.cta}`);
  return parts.join("\n\n\n");
}

function tagsOf(article) {
  return (article.hashtags || "")
    .split(/\s+/)
    .map((t) => t.replace(/^#/, "").trim())
    .filter(Boolean)
    .slice(0, 10);
}

// ---- ブラウザ操作 ----
async function firstVisible(page, locators) {
  for (const make of locators) {
    const loc = make(page).first();
    if (await loc.isVisible().catch(() => false)) return loc;
  }
  return null;
}

async function clickButton(page, names, { required = true } = {}) {
  const loc = await firstVisible(
    page,
    names.map((name) => (p) => p.getByRole("button", { name })),
  );
  if (loc) {
    await loc.click();
    return true;
  }
  if (required) throw new Error(`ボタンが見つかりません: ${names.join(" / ")}`);
  return false;
}

async function ensureLoggedIn(page) {
  await page.goto("https://note.com/notes/new", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  if (!page.url().includes("/login")) return;
  log("⚠️ noteに未ログインです。開いたブラウザで手動ログインしてください（5分以内）...");
  const deadline = Date.now() + 5 * 60_000;
  while (Date.now() < deadline) {
    await page.waitForTimeout(5000);
    if (!page.url().includes("/login")) {
      // ログイン後、改めてエディタへ
      await page.goto("https://note.com/notes/new", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(3000);
      if (!page.url().includes("/login")) {
        log("✅ ログインを確認しました");
        return;
      }
    }
  }
  throw new Error("ログインがタイムアウトしました");
}

async function fillEditor(page, article, body) {
  await page.goto("https://note.com/notes/new", { waitUntil: "domcontentloaded" });
  const title = await firstVisible(page, [
    (p) => p.getByPlaceholder(/タイトル/),
    (p) => p.locator("textarea"),
  ]);
  if (!title) throw new Error("タイトル欄が見つかりません");
  await title.click();
  await page.keyboard.insertText(article.title);

  const editor = page.locator('[contenteditable="true"]').first();
  await editor.waitFor({ state: "visible", timeout: 15000 });
  await editor.click();
  await page.keyboard.insertText(body);
  await page.waitForTimeout(2000); // 自動保存待ち
}

async function saveDraft(page) {
  const clicked = await clickButton(page, [/下書き保存/, /保存/], { required: false });
  await page.waitForTimeout(3000); // 自動保存にも猶予
  return clicked;
}

async function publishFree(page, article) {
  await clickButton(page, [/公開に進む/, /公開設定/, /次へ/]);
  await page.waitForTimeout(2500);

  // ハッシュタグ入力（見つからなくても続行）
  const tagInput = await firstVisible(page, [
    (p) => p.getByPlaceholder(/ハッシュタグ/),
    (p) => p.getByPlaceholder(/タグ/),
  ]);
  if (tagInput) {
    for (const tag of tagsOf(article)) {
      await tagInput.click();
      await page.keyboard.insertText(tag);
      await page.keyboard.press("Enter");
      await page.waitForTimeout(300);
    }
  }

  await clickButton(page, [/投稿する/, /公開する/, /投稿/]);
  // 公開完了 → 記事URLへの遷移 or 完了ダイアログを待つ
  await page.waitForTimeout(5000);
  const m = page.url().match(/note\.com\/[^/]+\/n\/[a-zA-Z0-9]+/);
  if (m) return `https://${m[0]}`;
  // URLが取れない場合も投稿ボタンまでは押せているため、プロフィールURLを返す
  return null;
}

async function processArticle(context, article) {
  const page = await context.newPage();
  try {
    const sections = await sectionsOf(article.id);
    const body = buildBody(article, sections);
    const isPaid = article.article_type === "paid";

    log(`▶ 処理開始 [${isPaid ? "有料" : "無料"}] ${article.title.slice(0, 40)}`);
    await fillEditor(page, article, body);

    if (isPaid || DRAFT_ONLY) {
      await saveDraft(page);
      await pool.query(`UPDATE note_articles SET status = 'copied' WHERE id = $1`, [article.id]);
      log(
        isPaid
          ? `📝 下書き投入完了（有料記事のため、価格設定と公開はnote上で手動で行ってください）`
          : `📝 下書き投入完了（--draft-onlyモード）`,
      );
    } else {
      const url = await publishFree(page, article);
      await pool.query(
        `UPDATE note_articles SET status = 'posted', posted_at = now(), note_url = COALESCE($2, note_url) WHERE id = $1`,
        [article.id, url],
      );
      log(`🎉 公開完了: ${url ?? "(URL取得失敗・note上で確認してください)"}`);
    }
    return true;
  } catch (e) {
    const shot = join(LOG_DIR, `error-${article.id.slice(0, 8)}-${Date.now()}.png`);
    await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
    log(`❌ 失敗: ${article.title.slice(0, 30)} — ${e.message}`);
    log(`   スクリーンショット: ${shot}`);
    log(`   この記事はスキップします（statusは変更しません）。次回また試行されます`);
    return false;
  } finally {
    await page.close().catch(() => {});
  }
}

async function main() {
  log(`note自動投稿ランナー起動 (${ONCE ? "1回実行" : "常駐監視"}${DRAFT_ONLY ? "・下書きのみ" : ""})`);
  log("対象: 承認済み かつ 投稿予定時刻を過ぎた記事のみ。有料記事は下書き投入まで。");

  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    channel: "msedge",
    headless: false,
    viewport: { width: 1280, height: 900 },
  });

  try {
    const page = await context.newPage();
    await ensureLoggedIn(page);
    await page.close();

    for (;;) {
      const due = await dueArticles();
      if (due.length > 0) {
        log(`予定時刻を過ぎた承認済み記事: ${due.length}件`);
        for (const article of due) {
          const recent = await postedInLastHour();
          if (recent >= MAX_PER_HOUR) {
            log(`⏸ 直近1時間で${recent}件投稿済みのため待機します（上限${MAX_PER_HOUR}件/時）`);
            break;
          }
          await processArticle(context, article);
          await new Promise((r) => setTimeout(r, MIN_GAP_MS));
        }
      } else if (ONCE) {
        log("処理対象はありません");
      }
      if (ONCE) break;
      await new Promise((r) => setTimeout(r, POLL_MS));
    }
  } finally {
    await context.close().catch(() => {});
    await pool.end().catch(() => {});
  }
  log("終了");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
