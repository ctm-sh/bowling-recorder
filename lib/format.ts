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

/** 금액 숫자만: 8400 → "8,400" */
export function formatAmount(amount: number) {
  return amount.toLocaleString("ko-KR");
}
