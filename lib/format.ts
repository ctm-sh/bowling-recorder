const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** "2026-10-25" → "10/25 (토)" */
export function formatDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${m}/${d} (${weekday})`;
}

export function formatWon(amount: number) {
  return `${amount.toLocaleString("ko-KR")}원`;
}

/** "2026-10-25" → "10월 25일 (토)" */
export function formatDateLong(date: string) {
  const [, m, d] = date.split("-").map(Number);
  return `${m}월 ${d}일 ${formatDate(date).split(" ")[1]}`;
}

/** 랭킹전은 한 달에 한 번이라 달로 부른다: "2026-11-09" → "2026년 11월 랭킹전" */
export function rankingMatchTitle(date: string) {
  const [y, m] = date.split("-").map(Number);
  return `${y}년 ${m}월 랭킹전`;
}

/** 금액 숫자만: 8400 → "8,400" */
export function formatAmount(amount: number) {
  return amount.toLocaleString("ko-KR");
}
