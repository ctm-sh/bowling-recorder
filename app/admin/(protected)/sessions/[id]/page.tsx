import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { TierBadge } from "@/components/TierBadge";
import { listGames, type Game } from "@/lib/db/games";
import { formatDate } from "@/lib/format";
import { listMembers } from "@/lib/db/members";
import { getSession } from "@/lib/db/sessions";
import { teamColor } from "@/lib/teamColors";
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
    <div className="pb-8">
      <PageHeader
        title={`${formatDate(session.date)} 정모`}
        action={
          <Link href="/admin/sessions" className="text-sm text-muted underline">
            목록
          </Link>
        }
      />

      <FeeForm action={updateFee.bind(null, session.id)} fee={session.fee_per_game} />

      <section className="px-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold">참석 {attendees.length}명</h2>
          <Link href={`/admin/sessions/${session.id}/attendance`} className="text-sm font-bold text-brand underline">
            참석 체크
          </Link>
        </div>
        {attendees.length === 0 ? (
          <p className="rounded-xl bg-background p-4 text-sm text-muted">아직 참석자가 없어요.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {attendees.map((m) => (
              <li key={m.id} className="flex items-center gap-1.5 rounded-full border border-line py-1 pr-3 pl-1 text-sm">
                <TierBadge tier={m.tier} />
                {m.name}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6 px-4">
        <h2 className="mb-2 text-sm font-bold">게임 {games.length}개</h2>
        <div className="flex flex-col gap-3">
          {games.map((g) => (
            <GameCard key={g.id} sessionId={session.id} game={g} nameById={nameById} />
          ))}
        </div>

        {canPlay &&
          (lastGame ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link
                href={`/admin/sessions/${session.id}/games/new?from=${lastGame.id}`}
                className="flex h-14 items-center justify-center rounded-xl bg-brand-soft font-bold text-brand"
              >
                ↻ 팀 그대로 {nextGameNo}게임
              </Link>
              <Link
                href={`/admin/sessions/${session.id}/games/new`}
                className="flex h-14 items-center justify-center rounded-xl bg-brand font-bold text-white"
              >
                🎲 새로 구성
              </Link>
            </div>
          ) : (
            <Link
              href={`/admin/sessions/${session.id}/games/new`}
              className="mt-1 flex h-14 items-center justify-center rounded-xl bg-brand font-bold text-white"
            >
              1게임 팀 구성 →
            </Link>
          ))}
        {!session.closed_at && attendees.length < 2 && (
          <p className="rounded-xl bg-background p-4 text-sm text-muted">참석자가 2명 이상이어야 팀을 나눌 수 있어요.</p>
        )}
      </section>

      {games.length > 0 && (
        <section className="mt-6 px-4">
          <Link
            href={`/admin/sessions/${session.id}/settlement`}
            className={`flex h-14 items-center justify-center rounded-xl font-bold ${
              session.closed_at ? "bg-brand text-white" : "border-2 border-brand text-brand"
            }`}
          >
            {session.closed_at ? "✓ 마감됨 · 정산 보기" : "💸 정산 미리보기 · 정모 마감"}
          </Link>
        </section>
      )}

      {games.length === 0 && <DeleteSessionButton sessionId={session.id} />}
    </div>
  );
}

function GameCard({ sessionId, game, nameById }: { sessionId: string; game: Game; nameById: Map<string, string> }) {
  const sizes = game.teams.map((t) => t.team_members.length).join("·");
  return (
    <div className="rounded-2xl border border-line p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="font-bold">{game.game_no}게임</span>
        <span className="text-xs text-muted">
          {game.teams.length === game.teams.reduce((n, t) => n + t.team_members.length, 0) ? "개인전" : sizes}
          {game.mode === "manual" && " · 직접 구성"}
        </span>
        <span className="ml-auto rounded-md bg-background px-2 py-0.5 text-xs text-muted">
          {game.scoreCount > 0 ? `점수 ${game.scoreCount}명 입력` : "점수 입력 전"}
        </span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {game.teams.map((t) => (
          <li key={t.id} className="flex items-start gap-2 text-sm">
            <span className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ background: teamColor(t.team_no) }} aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="font-bold">{t.team_no}팀</span>{" "}
              {t.team_members.map((m) => nameById.get(m.member_id) ?? "?").join(", ")}
              {t.fill_score !== null && ", 꼭두각시"}
            </span>
            {t.handicap > 0 && (
              <span className="shrink-0 text-xs font-bold text-brand">
                핸디 +{t.handicap}
                {t.handicap !== t.handicap_default && "*"}
              </span>
            )}
          </li>
        ))}
      </ul>
      {game.teams.some((t) => t.handicap !== t.handicap_default) && (
        <p className="mt-2 text-xs text-muted">* 합의 조정</p>
      )}
      {game.scoreCount === 0 ? (
        <Link
          href={`/admin/sessions/${sessionId}/games/${game.id}/scores`}
          className="mt-3 flex h-12 items-center justify-center rounded-xl bg-brand text-sm font-bold text-white"
        >
          점수 입력 →
        </Link>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link
            href={`/admin/sessions/${sessionId}/games/${game.id}/scores`}
            className="flex h-12 items-center justify-center rounded-xl bg-brand-soft text-sm font-bold text-brand"
          >
            점수 보기·수정
          </Link>
          <Link
            href={`/admin/sessions/${sessionId}/games/${game.id}`}
            className="flex h-12 items-center justify-center rounded-xl bg-[#0b0f1a] text-sm font-bold text-white"
          >
            🎳 결과
          </Link>
        </div>
      )}
      {game.scoreCount === 0 && (
        <div className="mt-3 text-right">
          <DeleteGameButton sessionId={sessionId} gameId={game.id} />
        </div>
      )}
    </div>
  );
}
