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
