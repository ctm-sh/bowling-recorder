import { RankingGameScores, type GameScoreView } from "@/components/RankingGameScores";
import { TeamBadge, teamName } from "@/components/TeamBadge";
import { SectionTitle } from "@/components/ui";
import type { RankingMatchData } from "@/lib/db/rankingMatches";
import { RANKING_GAMES } from "@/lib/domain/rankingMatch";
import { formatWon } from "@/lib/format";

export const hasScore = (data: RankingMatchData) => data.entries.some((e) => e.scores.some((s) => s !== null));

/** 게임별 점수: 게임 안에서 합계가 높은 팀, 점수+핸디가 높은 사람부터 */
function gameViews(data: RankingMatchData): GameScoreView[] {
  const sources =
    data.match.format === "team"
      ? data.teams.map((t) => ({ key: t.id, teamNo: t.teamNo as number | null, fill: t.fill, members: t.members }))
      : [{ key: "all", teamNo: null, fill: null, members: data.entries }];

  return Array.from({ length: RANKING_GAMES }, (_, g) => ({
    gameNo: g + 1,
    groups: sources
      .map((s) => {
        const people = s.members
          .map((m) => ({ memberId: m.memberId, name: m.name, score: m.scores[g], handicap: m.handicap }))
          .sort((a, b) => (b.score === null ? -1 : b.score + b.handicap) - (a.score === null ? -1 : a.score + a.handicap));
        const entered = people.filter((p) => p.score !== null);
        return {
          key: s.key,
          teamNo: s.teamNo,
          fill: s.fill,
          people,
          total: entered.length === 0 ? null : entered.reduce((sum, p) => sum + p.score! + p.handicap, s.fill ?? 0),
        };
      })
      .sort((a, b) => (b.total ?? -1) - (a.total ?? -1)),
  }));
}

/** 랭킹전 결과: 상금, 팀 순위 또는 달성 구간, 개인 순위, 마스터즈 (운영진·회원 공용) */
export function RankingMatchResult({ data }: { data: RankingMatchData }) {
  const { match, rankedTeams, ranked, masters, byMember, prize, reached, targetTotal } = data;
  if (!hasScore(data)) return null;

  const name = (id: string | null) => (id ? (byMember.get(id)?.name ?? "?") : "?");
  const tiers = [...match.target_tiers].sort((a, b) => a.minTotal - b.minTotal);
  const nextTier = tiers.find((t) => t.minTotal > targetTotal);
  const winners = rankedTeams.filter((t) => t.rank === 1);
  const games = gameViews(data);
  // 처음에는 점수가 들어온 마지막 게임을 보여준다
  const latestGame = Math.max(
    1,
    ...games.filter((g) => g.groups.some((group) => group.total !== null)).map((g) => g.gameNo),
  );

  return (
    <>
      <section className="mx-5 mt-4 flex flex-col gap-1 rounded-[18px] bg-surface p-5">
        {match.format === "team" ? (
          <>
            <span className="text-[13px] font-semibold text-accent">팀전 {data.stage === "playing" ? "현재 1등" : "우승"}</span>
            <span className="text-[22px] font-bold tracking-[-0.4px]">
              {winners.map((t) => teamName(t.teamNo)).join(" · ")}
            </span>
            <span className="text-sm text-muted">상금 {formatWon(match.team_prize)}</span>
          </>
        ) : (
          <>
            <span className="text-[13px] font-semibold text-accent">점수 넘기기</span>
            <span className="text-[22px] font-bold tracking-[-0.4px]">{targetTotal.toLocaleString("ko-KR")}점</span>
            <span className="text-sm text-muted">
              {reached ? `${reached.minTotal.toLocaleString("ko-KR")}점 구간 달성 · 상금 ${formatWon(reached.prize)}` : "아직 달성한 구간 없음"}
              {nextTier && ` · 다음 구간까지 ${(nextTier.minTotal - targetTotal).toLocaleString("ko-KR")}점`}
            </span>
          </>
        )}
        {match.prize_representative_id && prize > 0 && (
          <span className="text-sm font-semibold">대표자 {name(match.prize_representative_id)}</span>
        )}
      </section>

      {rankedTeams.length > 0 && (
        <>
          <SectionTitle>팀 순위</SectionTitle>
          <ul className="mx-5 overflow-hidden rounded-2xl bg-surface">
            {rankedTeams.map((t) => (
              <li key={t.teamNo} className="flex items-center gap-3 border-b border-separator px-4 py-3 last:border-b-0">
                <span className="w-5 text-center text-[15px] font-bold">{t.rank}</span>
                <TeamBadge teamNo={t.teamNo} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{t.members.map((m) => name(m.memberId)).join(", ")}</span>
                  <span className="text-xs text-muted">
                    점수 {t.raw.toLocaleString("ko-KR")} + 핸디 {t.handicap}
                    {t.fill !== null && ` + 꼭두각시 ${t.total - t.raw - t.handicap}`}
                  </span>
                </span>
                <span className="text-[17px] font-bold">{t.total.toLocaleString("ko-KR")}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <SectionTitle>게임별 점수</SectionTitle>
      <RankingGameScores games={games} initialGame={latestGame} />

      <SectionTitle note="점수 합 + 핸디">개인 순위</SectionTitle>
      <ul className="mx-5 overflow-hidden rounded-2xl bg-surface">
        {ranked.map((e) => {
          const adjusted = byMember.get(e.memberId)!.handicapDefault !== e.handicap;
          return (
            <li key={e.memberId} className="flex min-h-[52px] items-center gap-3 border-b border-separator px-4 py-2 last:border-b-0">
              <span className="w-5 text-center text-[15px] font-bold">{e.rank}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base">{name(e.memberId)}</span>
                <span className="text-xs text-muted">
                  {e.scores.map((s) => s ?? "-").join(" · ")} · 핸디 {e.handicap}
                  {adjusted && " (합의 조정)"}
                </span>
              </span>
              <span className="text-[17px] font-bold">{e.total}</span>
            </li>
          );
        })}
      </ul>

      {masters.length > 0 && (
        <>
          <SectionTitle note={`우승 상금 ${formatWon(match.masters_prize)}`}>마스터즈</SectionTitle>
          <ul className="mx-5 overflow-hidden rounded-2xl bg-surface">
            {masters.map((m) => (
              <li key={m.memberId} className="flex min-h-[52px] items-center gap-3 border-b border-separator px-4 py-2 last:border-b-0">
                <span className="w-5 text-center text-[15px] font-bold">{m.rank ?? "-"}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base">
                    {name(m.memberId)}
                    {match.masters_winner_id === m.memberId && <span className="pl-1.5 text-xs font-semibold text-accent">우승</span>}
                  </span>
                  <span className="text-xs text-muted">
                    {m.score ?? "-"} + 핸디 {m.handicap}
                  </span>
                </span>
                <span className="text-[17px] font-bold">{m.total ?? "-"}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
