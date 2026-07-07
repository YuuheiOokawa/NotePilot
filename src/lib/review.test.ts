import { describe, expect, it } from "vitest";
import { canApprove, computeReadiness } from "./review";

describe("review: 投稿可否判定", () => {
  it("チェック未実施なら not_ready", () => {
    expect(
      computeReadiness({
        checked: false,
        hasUnverifiedClaims: false,
        typoCheckStatus: "not_checked",
        factCheckStatus: "not_checked",
      }),
    ).toBe("not_ready");
  });

  it("未確認情報が残っている限り絶対に ready にならない（重要ルール）", () => {
    expect(
      computeReadiness({
        checked: true,
        hasUnverifiedClaims: true,
        typoCheckStatus: "passed",
        factCheckStatus: "passed",
      }),
    ).toBe("needs_review");
  });

  it("誤字・表現の問題が残っていれば needs_review", () => {
    expect(
      computeReadiness({
        checked: true,
        hasUnverifiedClaims: false,
        typoCheckStatus: "issues_found",
        factCheckStatus: "passed",
      }),
    ).toBe("needs_review");
  });

  it("チェック済み・問題なし・未確認情報なしなら ready", () => {
    expect(
      computeReadiness({
        checked: true,
        hasUnverifiedClaims: false,
        typoCheckStatus: "passed",
        factCheckStatus: "passed",
      }),
    ).toBe("ready");
  });

  it("canApprove: ready かつ未確認情報なしのときだけ承認可能", () => {
    expect(canApprove("ready", false)).toBe(true);
    expect(canApprove("ready", true)).toBe(false); // 念のための二重ガード
    expect(canApprove("needs_review", false)).toBe(false);
    expect(canApprove("not_ready", false)).toBe(false);
  });
});
