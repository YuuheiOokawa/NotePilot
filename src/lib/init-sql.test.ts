import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { INIT_SQL } from "./init-sql";

describe("init-sql 埋め込み", () => {
  it("prisma/init.sql と同期している（ズレたら `npm run db:embed` を実行）", () => {
    const file = readFileSync(join(process.cwd(), "prisma", "init.sql"), "utf8");
    expect(INIT_SQL).toBe(file);
  });
});
