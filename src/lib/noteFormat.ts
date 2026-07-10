// noteのエディタは、貼り付け時に **太字** / ##見出し / -箇条書き / ```コードブロック 等の
// 基本的なMarkdown記法は自動変換して表示するが、Markdownのテーブル記法(| a | b |)だけは
// サポートしておらず、貼り付けると「|」等の記号がそのまま文字として残ってしまう。
// (note公式ヘルプに明記はないが、複数の実践記事で確認されている既知の制約)
//
// このモジュールは、コピー用テキストを組み立てる直前にMarkdownテーブルを検出し、
// noteにそのまま貼り付けても読める箇条書き形式に変換する。
// DBに保存された元のMarkdown本文(編集画面で表示される内容)は書き換えない
// ——あくまで「コピー用プレビューが出力するテキスト」だけを対象にした整形。

const TABLE_ROW_RE = /^\s*\|(.+)\|\s*$/;
const TABLE_SEPARATOR_RE = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

function isTableRow(line: string | undefined): boolean {
  return line != null && TABLE_ROW_RE.test(line);
}

function isSeparatorRow(line: string | undefined): boolean {
  return line != null && TABLE_ROW_RE.test(line) && TABLE_SEPARATOR_RE.test(line);
}

function splitRow(line: string): string[] {
  const inner = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return inner.split("|").map((cell) => cell.trim());
}

// ヘッダーとデータ行を、note貼り付け後も読める箇条書きテキストに変換する。
// 2列(用語集・比較表など)は「・A：B」、3列以上は「・見出し1: 値1／見出し2: 値2…」の形式にする。
function renderTableAsList(headers: string[], rows: string[][]): string[] {
  if (headers.length === 2) {
    return rows.map((cells) => `・${cells[0] ?? ""}：${cells[1] ?? ""}`);
  }
  return rows.map(
    (cells) => "・" + headers.map((h, i) => `${h}: ${cells[i] ?? ""}`).join("／"),
  );
}

export function convertMarkdownTablesForNote(text: string): string {
  if (!text.includes("|")) return text; // 早期リターン(パイプを含まない大半のテキストで走査を省略)

  const lines = text.split("\n");
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    if (isTableRow(lines[i]) && isSeparatorRow(lines[i + 1])) {
      const headers = splitRow(lines[i]);
      let j = i + 2;
      const rows: string[][] = [];
      while (j < lines.length && isTableRow(lines[j]) && !isSeparatorRow(lines[j])) {
        rows.push(splitRow(lines[j]));
        j++;
      }
      out.push(...renderTableAsList(headers, rows));
      i = j;
    } else {
      out.push(lines[i]);
      i++;
    }
  }

  return out.join("\n");
}
