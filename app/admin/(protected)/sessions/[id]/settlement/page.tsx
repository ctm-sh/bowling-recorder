import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/ActionButton";
import { CopyButton } from "@/components/CopyButton";
import { PageHeader } from "@/components/PageHeader";
import { listMembers } from "@/lib/db/members";
import { getSessionResults } from "@/lib/db/results";
import { getSession } from "@/lib/db/sessions";
import { settlementText, totalsByMember } from "@/lib/domain/settlement";
import { formatDate, formatWon } from "@/lib/format";
import { teamColor } from "@/lib/teamColors";
import { closeSession, reopenSession } from "../close-actions";

export default async function SettlementPage({ params }: PageProps<"/admin/sessions/[id]/settlement">) {
  const { id } = await params;
  const data = await getSession(id);
  if (!data) notFound();
  const { session } = data;
  const [results, members] = await Promise.all([getSessionResults(id, session.fee_per_game), listMembers()]);

  const names = new Map(members.map((m) => [m.id, m.name]));
  const nameOf = (m: string) => names.get(m) ?? "?";
  const done = results.filter((r) => r.complete);
  const incomplete = results.filter((r) => !r.complete);
  const games = done.map((r) => ({ gameNo: r.game.game_no, ranked: r.ranked, charges: r.charges }));
  const totals = totalsByMember(games);
  const sum = totals.reduce((s, t) => s + t.total, 0);
  const actualCost = done.reduce((s, r) => s + r.ranked.reduce((n, t) => n + t.members.length, 0), 0) * session.fee_per_game;
  const text = settlementText({ title: formatDate(session.date), games, nameOf });
  const closed = !!session.closed_at;

  return (
    <div className="pb-8">
      <PageHeader
        title={`${formatDate(session.date)} 정산`}
        action={
          <Link href={`/admin/sessions/${id}`} className="text-sm text-muted underline">
            정모
          </Link>
        }
      />

      <div className="m-4 rounded-2xl bg-brand p-5 text-white">
        <p className="text-xs opacity-80">{closed ? "마감된 정모" : "진행 중 · 미리보기"}</p>
        <p className="mt-1 text-3xl font-bold">{formatWon(sum)}</p>
        <p className="mt-1 text-sm opacity-80">
          {done.length}게임 · 실제 게임비 {formatWon(actualCost)}
          {sum !== actualCost && ` · 100원 올림 차액 ${formatWon(sum - actualCost)}`}
        </p>
      </div>

      {incomplete.length > 0 && (
        <p className="mx-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          점수가 덜 들어간 게임은 정산에서 빠졌어요: {incomplete.map((r) => `${r.game.game_no}게임`).join(", ")}
        </p>
      )}

      <section className="px-4 pt-2">
        <h2 className="mb-2 text-sm font-bold">사람별 낼 금액</h2>
        <ul className="overflow-hidden rounded-2xl border border-line">
          {totals.map((t) => (
            <li key={t.memberId} className="flex items-center border-b border-line px-4 py-3 last:border-b-0">
              <span className="font-bold">{nameOf(t.memberId)}</span>
              <span className="ml-2 text-xs text-muted">{t.games}게임</span>
              <span className={`ml-auto font-mono text-lg font-bold ${t.total > 0 ? "text-danger" : "text-muted"}`}>
                {formatWon(t.total)}
              </span>
            </li>
          ))}
          {totals.length === 0 && <li className="p-4 text-sm text-muted">정산할 게임이 없어요.</li>}
        </ul>
      </section>

      <section className="px-4 pt-6">
        <h2 className="mb-2 text-sm font-bold">게임별 결과</h2>
        <ul className="flex flex-col gap-2">
          {done.map((r) => (
            <li key={r.game.id}>
              <Link
                href={`/admin/sessions/${id}/games/${r.game.id}`}
                className="flex items-center gap-2 rounded-xl border border-line px-4 py-3 text-sm"
              >
                <span className="font-bold">{r.game.game_no}게임</span>
                <span className="flex flex-wrap gap-x-2">
                  {r.ranked.map((t) => (
                    <span key={t.teamNo} style={{ color: teamColor(t.teamNo) }} className="font-bold">
                      {t.rank === 1 ? "🥇" : t.rank === r.ranked.length ? "💸" : ""}
                      {t.teamNo}팀 {t.total}
                    </span>
                  ))}
                </span>
                <span className="ml-auto text-muted">›</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2 px-4 pt-6">
        <CopyButton
          text={text}
          label="📋 카톡용 정산 텍스트 복사"
          className="h-14 rounded-xl bg-[#fee500] text-base font-bold text-black"
        />
        <details className="rounded-xl bg-background p-3 text-sm">
          <summary className="cursor-pointer text-muted">복사될 내용 보기</summary>
          <pre className="mt-2 whitespace-pre-wrap font-sans">{text}</pre>
        </details>
        {closed ? (
          <ActionButton
            action={reopenSession.bind(null, id)}
            confirm="한 번 더 누르면 마감을 취소해요"
            className="mt-4 text-sm text-muted underline"
          >
            마감 취소 (점수를 다시 고쳐야 할 때)
          </ActionButton>
        ) : (
          <ActionButton
            action={closeSession.bind(null, id)}
            confirm="한 번 더 누르면 정모를 마감해요"
            className="h-14 w-full rounded-xl bg-brand font-bold text-white"
          >
            정모 마감
          </ActionButton>
        )}
      </section>
    </div>
  );
}
