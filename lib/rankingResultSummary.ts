import { rankingMatchTitle } from "@/lib/format";

/** 결과 텍스트에 들어가는 내용 */
export type RankingResultSummary = {
  /** "2026년 11월 랭킹전 결과" */
  title: string;
  label: "우승팀" | "점수 넘기기";
  /** 팀전은 우승 팀원 이름, 점수 넘기기는 판정 점수 */
  winner: string;
  /** "상금 10만원" 또는 "상금 없음" */
  prize: string;
  mastersWinner: string;
  mastersPrize: string;
};

/** 100000 → "10만원", 75000 → "75,000원" */
export function formatPrize(amount: number) {
  return amount > 0 && amount % 10000 === 0 ? `${amount / 10000}만원` : `${amount.toLocaleString("ko-KR")}원`;
}

export function buildRankingSummary(input: {
  date: string;
  format: "team" | "target";
  /** 1등 팀들의 팀원 이름 (공동 1등이면 여러 팀) */
  winnerTeams: string[][];
  targetTotal: number;
  prize: number;
  mastersWinner: string;
  mastersPrize: number;
}): RankingResultSummary {
  return {
    title: `${rankingMatchTitle(input.date)} 결과`,
    label: input.format === "team" ? "우승팀" : "점수 넘기기",
    winner:
      input.format === "team"
        ? input.winnerTeams.map((names) => names.join(" ")).join(" / ")
        : `${input.targetTotal.toLocaleString("ko-KR")}점`,
    prize: input.prize > 0 ? `상금 ${formatPrize(input.prize)}` : "상금 없음",
    mastersWinner: input.mastersWinner,
    mastersPrize: formatPrize(input.mastersPrize),
  };
}

export function rankingResultText(s: RankingResultSummary) {
  return `${s.title}\n\n${s.label}: ${s.winner} (${s.prize})\n마스터즈 우승: ${s.mastersWinner} ${s.mastersPrize}`;
}
