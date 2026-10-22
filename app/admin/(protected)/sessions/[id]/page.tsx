import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { TeamBadge, teamName } from "@/components/TeamBadge";
import { primaryButton, secondaryButton, SectionTitle } from "@/components/ui";
import { listGames, type Game } from "@/lib/db/games";
import { listMembers } from "@/lib/db/members";
import { getSession } from "@/lib/db/sessions";
import { formatDateLong } from "@/lib/format";
import { updateFee } from "../actions";
import { DeleteGameButton } from "./DeleteGameButton";
import { DeleteSessionButton } from "./DeleteSessionButton";
import { FeeForm } from "./FeeForm";

export default async function SessionPage({ params }: PageProps<"/admin/sessions/[id]">) {
  const { id } = await params;
  const [data, members, games] = await Promise.all([getSession(id), listMembers(), listGames(id)]);
  if (!data) notFound();
  const { session, attendeeIds } = data;

  const attending = new Set(attendeeIds);
  const attendees = members.filter((m) => attending.has(m.id));
  const nameById = new Map(members.map((m) => [m.id, m.name]));
  const lastGame = games.at(-1);
  const nextGameNo = (lastGame?.game_no ?? 0) + 1;
  const canPlay = !session.closed_at && attendees.length >= 2;

  return (
    <div className="pb-6">
      <PageHeader
        back="/admin/sessions"
        backLabel="정모 목록"
        eyebrow={session.closed_at ? "마감" : <span className="text-accent">진행 중</span>}
        title={`${formatDateLong(session.date)}`}
      />

      <FeeForm action={updateFee.bind(null, session.id)} fee={session.fee_per_game} />

      <SectionTitle
        note={
          <Link
            href={`/admin/sessions/${session.id}/attendance`}
            className="flex min-h-11 items-center text-[15px] text-link"
          >
            참석 체크
          </Link>
        }
        className="items-center pt-4 pb-0"
      >
        참석 <span className="text-accent">{attendees.length}</span>명
      </SectionTitle>
      {attendees.length === 0 ? (
        <p className="mx-5 rounded-2xl bg-surface p-4 text-[15px] text-muted">아직 참석자가 없어요.</p>
      ) : (
        <ul className="flex flex-wrap gap-1.5 px-5">
          {attendees.map((m) => (
            <li key={m.id} className="rounded-full bg-surface px-3 py-1.5 text-sm">
              {m.name}
            </li>
          ))}
        </ul>
      )}

      <SectionTitle>게임 {games.length}개</SectionTitle>
      <div className="flex flex-col gap-3 px-5">
        {games.map((g) => (
          <GameCard key={g.id} sessionId={session.id} game={g} nameById={nameById} />
        ))}

        {canPlay &&
          (lastGame ? (
            <div className="grid grid-cols-2 gap-2.5">
              <Link href={`/admin/sessions/${session.id}/games/new?from=${lastGame.id}`} className={secondaryButton}>
                <Icon name="repeat" size={18} />팀 그대로 {nextGameNo}게임
              </Link>
              <Link href={`/admin/sessions/${session.id}/games/new`} className={secondaryButton}>
                <Icon name="shuffle" size={18} />
                새로 구성
              </Link>
            </div>
          ) : (
            <Link href={`/admin/sessions/${session.id}/games/new`} className={primaryButton}>
              1게임 팀 구성
            </Link>
          ))}
        {!session.closed_at && attendees.length < 2 && (
          <p className="rounded-2xl bg-surface p-4 text-[15px] text-muted">
            참석자가 2명 이상이어야 팀을 나눌 수 있어요.
          </p>
        )}

        {games.length > 0 && (
          <Link href={`/admin/sessions/${session.id}/settlement`} className={primaryButton}>
            {session.closed_at ? "마감됨 · 정산 보기" : "정산 미리보기 · 정모 마감"}
          </Link>
        )}
      </div>

      <DeleteSessionButton
        sessionId={session.id}
        gameCount={games.length}
        scoreCount={games.reduce((n, g) => n + g.scoreCount, 0)}
        closed={!!session.closed_at}
      />
    </div>
  );
}

function GameCard({ sessionId, game, nameById }: { sessionId: string; game: Game; nameById: Map<string, string> }) {
  const sizes = game.teams.map((t) => t.team_members.length).join(" · ");
  const adjusted = game.teams.some((t) => t.handicap !== t.handicap_default);
  return (
    <div className="rounded-2xl bg-surface">
      <div className="flex items-center gap-2 px-4 pt-3.5 pb-1">
        <span className="text-[17px] font-semibold">{game.game_no}게임</span>
        <span className="flex-1 text-xs text-muted">
          {game.teams.length === game.teams.reduce((n, t) => n + t.team_members.length, 0) ? "개인전" : sizes}
          {game.mode === "manual" && " · 직접 구성"}
        </span>
        <span className="text-xs text-muted">
          {game.scoreCount > 0 ? `점수 ${game.scoreCount}명 입력` : "점수 입력 전"}
        </span>
      </div>
      <ul className="flex flex-col gap-1.5 px-4 py-2">
        {game.teams.map((t) => (
          <li key={t.id} className="flex items-start gap-2 text-sm">
            <TeamBadge teamNo={t.team_no} size={20} />
            <span className="min-w-0 flex-1 leading-5">
              <span className="sr-only">{teamName(t.team_no)} </span>
              {t.team_members.map((m) => nameById.get(m.member_id) ?? "?").join(", ")}
              {t.fill_score !== null && <span className="text-muted">, 꼭두각시</span>}
            </span>
            {t.handicap > 0 && (
              <span className="shrink-0 text-xs font-semibold text-accent">
                핸디 +{t.handicap}
                {t.handicap !== t.handicap_default && "*"}
              </span>
            )}
          </li>
        ))}
      </ul>
      {adjusted && <p className="px-4 text-xs text-muted">* 합의 조정</p>}
      <div className="grid grid-cols-2 gap-2 p-3 pt-2">
        <Link href={`/admin/sessions/${sessionId}/games/${game.id}/scores`} className={secondaryButton}>
          {game.scoreCount === 0 ? "점수 입력" : "점수 보기·수정"}
        </Link>
        <Link href={`/admin/sessions/${sessionId}/games/${game.id}`} className={secondaryButton}>
          결과
        </Link>
      </div>
      {game.scoreCount === 0 && (
        <div className="px-4 pb-3 text-right">
          <DeleteGameButton sessionId={sessionId} gameId={game.id} />
        </div>
      )}
    </div>
  );
}
