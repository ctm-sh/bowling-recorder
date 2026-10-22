/** 입력칸 문자열 → 점수. 빈칸은 null(미입력), 잘못된 값은 에러 메시지. */
export function parseScore(input: string): { score: number | null } | { error: string } {
  const text = input.trim();
  if (text === "") return { score: null };
  if (!/^\d{1,3}$/.test(text)) return { error: "숫자만 입력해주세요." };
  const score = Number(text);
  if (score > 300) return { error: "점수는 0~300이에요." };
  return { score };
}

/** 이 값을 입력했으면 다음 칸으로 넘어가도 되는지: 3자리이거나, 더 붙이면 300을 넘는 경우 */
export function isCompleteScore(input: string) {
  const text = input.trim();
  if (!/^\d{1,3}$/.test(text)) return false;
  return text.length === 3 || Number(text) * 10 > 300;
}
