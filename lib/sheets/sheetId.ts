/** 시트 URL 또는 ID에서 ID만 뽑는다. 알아볼 수 없으면 null */
export function parseSheetId(input: string) {
  const text = input.trim();
  const fromUrl = text.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (fromUrl) return fromUrl[1];
  return /^[a-zA-Z0-9-_]{20,}$/.test(text) ? text : null;
}
