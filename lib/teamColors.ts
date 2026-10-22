// 팀 번호별 색 (팀 구성 A안은 점 색, 결과 B안은 네온 색으로 사용)
const COLORS = ["#f97316", "#0ea5e9", "#22c55e", "#ec4899", "#8b5cf6", "#eab308", "#14b8a6", "#ef4444"];

export function teamColor(teamNo: number) {
  return COLORS[(teamNo - 1) % COLORS.length];
}
