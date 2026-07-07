// prisma/init.sql を src/lib/init-sql.ts に埋め込む。
// Vercelのサーバーレス関数には prisma/init.sql が同梱されないため、
// スキーマ自動初期化（src/lib/bootstrap.ts）はTSモジュール化したSQLを使う。
// init.sql を変更したら `npm run db:embed` で再生成する（ズレは init-sql.test.ts が検知）。
import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sql = readFileSync(join(root, "prisma", "init.sql"), "utf8");

const out = `// 自動生成ファイル - 直接編集しないでください。
// prisma/init.sql を変更したら \`npm run db:embed\` で再生成します。
export const INIT_SQL = ${JSON.stringify(sql)};
`;

writeFileSync(join(root, "src", "lib", "init-sql.ts"), out);
console.log("src/lib/init-sql.ts を再生成しました");
