// 팀은 색이 아니라 A/B/C 글자 배지 + 명암으로 구분한다.
// A: 검정 채움, B: 회색 채움, C 이후: 테두리만.

export function teamLetter(teamNo: number) {
  return String.fromCharCode(64 + teamNo);
}

export function teamName(teamNo: number) {
  return `${teamLetter(teamNo)}팀`;
}

/** tone: light(밝은 화면) / dark(어두운 화면) / onAccent(파란 1등 행 위) */
export function TeamBadge({
  teamNo,
  size = 22,
  tone = "light",
}: {
  teamNo: number;
  size?: number;
  tone?: "light" | "dark" | "onAccent";
}) {
  const style =
    tone === "onAccent"
      ? "bg-white text-accent"
      : teamNo === 1
        ? tone === "dark"
          ? "bg-white text-black"
          : "bg-foreground text-white"
        : teamNo === 2
          ? tone === "dark"
            ? "bg-edge text-black"
            : "bg-[#86868b] text-white"
          : tone === "dark"
            ? "border border-dark-muted text-white"
            : "border border-foreground text-foreground";
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold ${style}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.5) }}
    >
      {teamLetter(teamNo)}
    </span>
  );
}
