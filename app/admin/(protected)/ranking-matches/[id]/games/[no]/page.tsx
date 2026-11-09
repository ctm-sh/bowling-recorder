import { notFound, redirect } from "next/navigation";
import { teamName } from "@/components/TeamBadge";
import { getRankingMatch } from "@/lib/db/rankingMatches";
import { RANKING_GAMES } from "@/lib/domain/rankingMatch";
import { saveRankingScore } from "../../../actions";
import { RankingScoreSheet, type SheetGroup } from "../../RankingScoreSheet";

export default async function RankingGamePage({ params }: PageProps<"/admin/ranking-matches/[id]/games/[no]">) {
  const { id, no } = await params;
  const gameNo = Number(no);
  if (!Number.isInteger(gameNo) || gameNo < 1 || gameNo > RANKING_GAMES) notFound();
  const data = await getRankingMatch(id);
  if (!data) notFound();
  const hub = `/admin/ranking-matches/${id}`;
  if (data.stage === "setup") redirect(`${hub}/setup`);

  const person = (e: (typeof data.entries)[number]) => ({ id: e.entryId, name: e.name, handicap: e.handicap });
  const groups: SheetGroup[] =
    data.match.format === "team"
      ? data.teams.map((t) => ({
          key: t.id,
          label: teamName(t.teamNo),
          fill: t.fill,
          people: t.members.map(person),
        }))
      : [{ key: "all", label: "참가자 전원", fill: null, people: data.entries.map(person) }];

  const initialScores = Object.fromEntries(
    data.entries.flatMap((e) => (e.scores[gameNo - 1] === null ? [] : [[e.entryId, e.scores[gameNo - 1]!]])),
  );

  return (
    <RankingScoreSheet
      key={gameNo}
      title={`${gameNo}게임 점수`}
      back={hub}
      groups={groups}
      initialScores={initialScores}
      readOnly={!!data.match.closed_at}
      notice={
        data.match.masters_size !== null && !data.match.closed_at
          ? "마스터즈 진출자가 이미 정해졌어요. 점수를 고쳐 순위가 바뀌면 진출자를 다시 확인해주세요."
          : undefined
      }
      save={saveRankingScore.bind(null, id, gameNo)}
      nextHref={gameNo < RANKING_GAMES ? `${hub}/games/${gameNo + 1}` : hub}
      nextLabel={gameNo < RANKING_GAMES ? `${gameNo + 1}게임 점수 입력` : "3게임 결과 보기"}
    />
  );
}
