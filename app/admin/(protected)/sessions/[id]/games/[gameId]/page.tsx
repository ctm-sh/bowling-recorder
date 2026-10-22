import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/ActionButton";
import { GameBoard } from "@/components/GameBoard";
import { listMembers } from "@/lib/db/members";
import { getSessionResults } from "@/lib/db/results";
import { getSession } from "@/lib/db/sessions";
import { closeSession } from "../../close-actions";

export default async function GameResultPage({ params }: PageProps<"/admin/sessions/[id]/games/[gameId]">) {
  const { id, gameId } = await params;
  const data = await getSession(id);
  if (!data) notFound();
  const [results, members] = await Promise.all([getSessionResults(id, data.session.fee_per_game), listMembers()]);
  const result = results.find((r) => r.game.id === gameId);
  if (!result) notFound();

  const names = new Map(members.map((m) => [m.id, m.name]));
  const isLast = results.at(-1)?.game.id === gameId;
  const closed = !!data.session.closed_at;

  return (
    <div className="min-h-dvh bg-[#0b0f1a]">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-1 bg-black px-2 text-white">
        <Link
          href={`/admin/sessions/${id}`}
          aria-label="뒤로 가기"
          className="flex size-10 items-center justify-center rounded-full text-2xl active:bg-white/10"
        >
          ‹
        </Link>
        <h1 className="text-lg font-bold">🎳 {result.game.game_no}게임 결과</h1>
      </header>

      <GameBoard
        ranked={result.ranked}
        nameOf={(m) => names.get(m) ?? "?"}
        puppets={Object.fromEntries(result.game.teams.map((t) => [t.team_no, t.fill_score]))}
        complete={result.complete}
        missing={result.missing}
        charges={result.charges}
      />

      <div className="flex flex-col gap-2 px-4 pb-24">
        <Link
          href={`/admin/sessions/${id}/games/${gameId}/scores`}
          className="flex h-12 items-center justify-center rounded-xl bg-[#1f2937] font-bold text-gray-100"
        >
          ✏️ 점수 {result.complete ? "수정" : "입력"}
        </Link>
        {!closed && isLast && result.complete && (
          <div className="grid grid-cols-2 gap-2">
            <Link
              href={`/admin/sessions/${id}/games/new?from=${gameId}`}
              className="flex h-14 items-center justify-center rounded-xl bg-[#1f2937] font-bold text-gray-100"
            >
              ↻ 팀 그대로
            </Link>
            <Link
              href={`/admin/sessions/${id}/games/new`}
              className="flex h-14 items-center justify-center rounded-xl bg-[#1f2937] font-bold text-gray-100"
            >
              🎲 새로 섞기
            </Link>
          </div>
        )}
        {!closed && isLast && result.complete && (
          <ActionButton
            action={closeSession.bind(null, id)}
            confirm="한 번 더 누르면 정모를 마감해요"
            className="h-14 w-full rounded-xl bg-[#ff9f43] font-bold text-black"
          >
            정모 마감 · 정산 보기
          </ActionButton>
        )}
        {closed && (
          <Link
            href={`/admin/sessions/${id}/settlement`}
            className="flex h-14 items-center justify-center rounded-xl bg-[#ff9f43] font-bold text-black"
          >
            정산 보기
          </Link>
        )}
      </div>
    </div>
  );
}
