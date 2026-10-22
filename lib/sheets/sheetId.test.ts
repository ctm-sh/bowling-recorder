import { describe, expect, it } from "vitest";
import { parseSheetId } from "./sheetId";

describe("parseSheetId", () => {
  const id = "1AbCdEfGhIjKlMnOpQrStUvWxYz_0123456789-abc";

  it("시트 주소에서 ID 추출", () => {
    expect(parseSheetId(`https://docs.google.com/spreadsheets/d/${id}/edit#gid=0`)).toBe(id);
    expect(parseSheetId(`  https://docs.google.com/spreadsheets/d/${id}  `)).toBe(id);
  });

  it("ID만 넣어도 됨", () => {
    expect(parseSheetId(id)).toBe(id);
  });

  it("알아볼 수 없으면 null", () => {
    expect(parseSheetId("https://example.com/sheet")).toBeNull();
    expect(parseSheetId("abc")).toBeNull();
    expect(parseSheetId("")).toBeNull();
  });
});
