import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/ActionButton";
import { BottomBar, StepBar } from "@/components/Flow";
import { ChargeList, Duels, ScoreTiles, Scoreboard } from "@/components/GameResult";
import { Icon } from "@/components/Icon";
import { NavBar } from "@/components/PageHeader";
import { primaryButton, SectionTitle, whiteButton } from "@/components/ui";
import { listMembers } from "@/lib/db/members";
import { getSessionResults } from "@/lib/db/results";
import { getSession } from "@/lib/db/sessions";
import { formatAmount } from "@/lib/format";
import { closeSession } from "../../close-actions";

export default async function GameResultPage({ params }: PageProps<"/admin/sessions/[id]/games/[gameId]">) {
  const { id, gameId } = await params;
  const data = await getSession(id);
  if (!data) notFound();
  const [results, members] = await Promise.all([getSessionResults(id, data.session.fee_per_game), listMembers()]);
  const result = results.find((r) => r.game.id === gameId);
  if (!result) notFound();

  const names = new Map(members.map((m) => [m.id, m.name]));
  const nameOf = (m: string) => names.get(m) ?? "?";
  const puppets = Object.fromEntries(result.game.teams.map((t) => [t.team_no, t.fill_score]));
  const isLast = results.at(-1)?.game.id === gameId;
  const closed = !!data.session.closed_at;
  const total = result.charges.reduce((s, c) => s + c.amount, 0);
  const next = !closed && isLast && result.complete;

  return (
    <div className="screen-dark min-h-dvh bg-black text-white">
      <NavBar
        dark
        title={`${result.game.game_no}게임 결과`}
        back={`/admin/sessions/${id}/games/${gameId}/scores`}
        backLabel={result.complete ? "점수 수정" : "점수 입력"}
        backText
        right={
          <Link href={`/admin/sessions/${id}`} className="flex min-h-11 items-center text-[17px] text-dark-link">
            정모
          </Link>
        }
      />
      <StepBar current="결과" dark />

      {result.complete ? (
        <ScoreTiles ranked={result.ranked} complete />
      ) : (
        <Scoreboard ranked={result.ranked} puppets={puppets} complete={false} missing={result.missing} />
      )}

      {result.complete && (
        <>
          <SectionTitle dark note={`총 ${formatAmount(total)}원 · ${result.charges.length}명분`}>
            이번 게임 정산
          </SectionTitle>
          <ChargeList ranked={result.ranked} charges={result.charges} nameOf={nameOf} />
        </>
      )}

      <SectionTitle dark note="같은 줄끼리 · 점수+받은 핸디">
        상대 대결
      </SectionTitle>
      <Duels ranked={result.ranked} puppets={puppets} nameOf={nameOf} scored={result.scores} />

      <BottomBar dark>
        {next && (
          <>
            <div className="grid grid-cols-2 gap-2.5">
              <Link href={`/admin/sessions/${id}/games/new?from=${gameId}`} className={primaryButton}>
                <Icon name="repeat" size={18} strokeWidth={2} />팀 그대로
              </Link>
              <Link href={`/admin/sessions/${id}/games/new`} className={whiteButton}>
                <Icon name="shuffle" size={18} strokeWidth={2} />
                새로 섞기
              </Link>
            </div>
            <ActionButton
              action={closeSession.bind(null, id)}
              confirm="한 번 더 누르면 정모를 마감해요"
              className="flex min-h-9 w-full items-center justify-center text-[15px] text-dark-link"
            >
              정모 마감하고 정산하기
            </ActionButton>
          </>
        )}
        {!result.complete && !closed && (
          <Link href={`/admin/sessions/${id}/games/${gameId}/scores`} className={primaryButton}>
            점수 입력 이어하기 · {result.missing}명 남음
          </Link>
        )}
        {closed && (
          <Link href={`/admin/sessions/${id}/settlement`} className={primaryButton}>
            정산 보기
          </Link>
        )}
        {!next && !closed && result.complete && (
          <Link href={`/admin/sessions/${id}`} className={primaryButton}>
            정모로 돌아가기
          </Link>
        )}
      </BottomBar>
    </div>
  );
}
