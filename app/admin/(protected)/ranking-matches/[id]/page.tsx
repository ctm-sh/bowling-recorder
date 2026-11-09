import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/ActionButton";
import { CopyButton } from "@/components/CopyButton";
import { Steps } from "@/components/Flow";
import { PageHeader } from "@/components/PageHeader";
import { RankingMatchResult } from "@/components/RankingMatchResult";
import { primaryButton, secondaryButton, SectionTitle } from "@/components/ui";
import { getRankingMatch, type RankingMatchData } from "@/lib/db/rankingMatches";
import { mastersWinnerCandidates, RANKING_GAMES, representativeCandidates, type MatchStage } from "@/lib/domain/rankingMatch";
import { formatDateLong, rankingMatchTitle } from "@/lib/format";
import { buildRankingSummary, rankingResultText } from "@/lib/rankingResultSummary";
import { closeRankingMatch, deleteRankingMatch, reopenRankingMatch } from "../actions";
import { FinishPanel } from "./FinishPanel";

const STEPS = ["구성", "1·2·3게임", "결과", "마스터즈", "마감"];
const STEP_AT: Record<MatchStage, number> = { setup: 0, playing: 1, "pick-masters": 2, masters: 3, finish: 4, closed: 4 };

function resultSummary(data: RankingMatchData) {
  const { match, prize, rankedTeams, targetTotal, byMember } = data;
  const name = (id: string | null) => (id ? (byMember.get(id)?.name ?? "?") : "-");
  return buildRankingSummary({
    date: match.date,
    format: match.format!,
    winnerTeams: rankedTeams.filter((t) => t.rank === 1).map((t) => t.members.map((m) => name(m.memberId))),
    targetTotal,
    prize,
    mastersWinner: name(match.masters_winner_id),
    mastersPrize: match.masters_prize,
  });
}

export default async function RankingMatchPage({ params }: PageProps<"/admin/ranking-matches/[id]">) {
  const { id } = await params;
  const data = await getRankingMatch(id);
  if (!data) notFound();
  const { match, entries, stage } = data;
  const base = `/admin/ranking-matches/${id}`;
  const scored = entries.some((e) => e.scores.some((s) => s !== null));
  const counts = Array.from({ length: RANKING_GAMES }, (_, i) => entries.filter((e) => e.scores[i] !== null).length);
  const nextGame = counts.findIndex((c) => c < entries.length) + 1;
  const name = (memberId: string) => ({ id: memberId, name: data.byMember.get(memberId)?.name ?? "?" });

  return (
    <div className="pb-6">
      <PageHeader
        back="/admin/ranking-matches"
        backLabel="랭킹전 목록"
        eyebrow={match.closed_at ? "마감" : <span className="text-accent">진행 중</span>}
        title={rankingMatchTitle(match.date)}
        sub={[
          formatDateLong(match.date),
          match.format === "team" ? "팀전" : match.format === "target" ? "점수 넘기기" : null,
          entries.length > 0 ? `${entries.length}명` : null,
        ]
          .filter(Boolean)
          .join(" · ")}
      />
      <Steps steps={STEPS} at={STEP_AT[stage]} />

      <div className="flex flex-col gap-3 px-5 pt-5">
        {stage === "setup" && (
          <Link href={`${base}/setup`} className={primaryButton}>
            참가자·구성 정하기
          </Link>
        )}
        {stage === "playing" && (
          <Link href={`${base}/games/${nextGame}`} className={primaryButton}>
            {nextGame}게임 점수 입력
          </Link>
        )}
        {stage === "pick-masters" && (
          <Link href={`${base}/masters`} className={primaryButton}>
            마스터즈 진출자 정하기
          </Link>
        )}
        {stage === "masters" && (
          <Link href={`${base}/masters`} className={primaryButton}>
            마스터즈 점수 입력
          </Link>
        )}
      </div>

      {stage !== "setup" && (
        <>
          <SectionTitle>게임</SectionTitle>
          <div className="grid grid-cols-3 gap-2 px-5">
            {counts.map((count, i) => (
              <Link key={i} href={`${base}/games/${i + 1}`} className={`${secondaryButton} flex-col gap-0`}>
                {i + 1}게임
                <span className="text-xs font-normal text-muted">
                  {count}/{entries.length}
                </span>
              </Link>
            ))}
          </div>
          {!scored && !match.closed_at && (
            <div className="px-5 pt-2 text-right">
              <Link href={`${base}/setup`} className="inline-flex min-h-11 items-center text-[15px] text-link">
                참가자·핸디·구성 수정
              </Link>
            </div>
          )}
        </>
      )}

      <RankingMatchResult data={data} />

      {(stage === "masters" || stage === "finish") && (
        <div className="grid grid-cols-2 gap-2.5 px-5 pt-4">
          <Link href={`${base}/masters?edit=1`} className={secondaryButton}>
            진출자 다시 정하기
          </Link>
          <Link href={`${base}/masters`} className={secondaryButton}>
            마스터즈 점수
          </Link>
        </div>
      )}

      {stage === "finish" && (
        <FinishPanel
          prize={data.prize}
          representatives={representativeCandidates(match.format!, entries, data.rankedTeams).map(name)}
          winners={mastersWinnerCandidates(data.masters).map(name)}
          close={closeRankingMatch.bind(null, id)}
        />
      )}

      {stage === "closed" && (
        <div className="flex flex-col gap-2.5 px-5 pt-5">
          <CopyButton text={rankingResultText(resultSummary(data))} label="결과 텍스트 복사" className={primaryButton} />
          <ActionButton
            action={reopenRankingMatch.bind(null, id)}
            confirm="정말 마감을 취소할까요?"
            className={`${secondaryButton} w-full`}
          >
            마감 취소 (점수를 다시 고쳐야 할 때)
          </ActionButton>
        </div>
      )}

      <div className="px-5 pt-8 text-center">
        <ActionButton
          action={deleteRankingMatch.bind(null, id)}
          confirm="점수까지 모두 지워져요. 정말 삭제할까요?"
          className="min-h-11 text-[15px] text-danger"
        >
          이 랭킹전 삭제
        </ActionButton>
      </div>
    </div>
  );
}
