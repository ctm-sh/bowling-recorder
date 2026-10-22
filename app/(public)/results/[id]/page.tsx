import { notFound } from "next/navigation";
import { GameBoard } from "@/components/GameBoard";
import { PageHeader } from "@/components/PageHeader";
import { listMembers } from "@/lib/db/members";
import { getSessionResults } from "@/lib/db/results";
import { getSession } from "@/lib/db/sessions";
import { totalsByMember } from "@/lib/domain/settlement";
import { formatDate, formatWon } from "@/lib/format";
import { getMeId } from "@/lib/me";
import { teamColor } from "@/lib/teamColors";

export default async function SessionResultPage({ params }: PageProps<"/results/[id]">) {
  const { id } = await params;
  const data = await getSession(id);
  if (!data) notFound();
  const { session } = data;
  const [results, members, meId] = await Promise.all([
    getSessionResults(id, session.fee_per_game),
    listMembers(),
    getMeId(),
  ]);

  const names = new Map(members.map((m) => [m.id, m.name]));
  const nameOf = (m: string) => names.get(m) ?? "?";
  const done = results.filter((r) => r.complete);
  const totals = totalsByMember(done.map((r) => ({ gameNo: r.game.game_no, ranked: r.ranked, charges: r.charges })));

  // 전체 점수표: 사람 × 게임 (팀 색으로 표시)
  const players = [...new Set(results.flatMap((r) => r.game.teams.flatMap((t) => t.team_members.map((m) => m.member_id))))];
  const cell = (memberId: string, r: (typeof results)[number]) => {
    const team = r.game.teams.find((t) => t.team_members.some((m) => m.member_id === memberId));
    return team ? { score: r.scores[memberId], teamNo: team.team_no } : null;
  };
  const playerRows = players
    .map((p) => {
      const scores = results.map((r) => r.scores[p]).filter((s) => s !== undefined);
      return { id: p, avg: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0 };
    })
    .sort((a, b) => b.avg - a.avg);

  return (
    <div className="pb-6">
      <PageHeader
        title={`${formatDate(session.date)} 결과`}
        back="/results"
      />

      {results.map((r) => (
        <section key={r.game.id}>
          <h2 className="bg-black px-4 pt-3 text-sm font-bold text-white">🎳 {r.game.game_no}게임</h2>
          <GameBoard
            ranked={r.ranked}
            nameOf={nameOf}
            puppets={Object.fromEntries(r.game.teams.map((t) => [t.team_no, t.fill_score]))}
            complete={r.complete}
            missing={r.missing}
            charges={r.charges}
            highlightMemberId={meId ?? undefined}
          />
        </section>
      ))}

      <section className="px-4 pt-6">
        <h2 className="mb-2 text-sm font-bold">전체 점수표</h2>
        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-background text-xs text-muted">
              <tr>
                <th className="px-3 py-2 text-left">이름</th>
                {results.map((r) => (
                  <th key={r.game.id} className="px-2 py-2 text-right">
                    {r.game.game_no}G
                  </th>
                ))}
                <th className="px-3 py-2 text-right">평균</th>
              </tr>
            </thead>
            <tbody>
              {playerRows.map((p) => (
                <tr key={p.id} className={`border-t border-line ${p.id === meId ? "bg-amber-50" : ""}`}>
                  <td className="px-3 py-2 font-bold whitespace-nowrap">{nameOf(p.id)}</td>
                  {results.map((r) => {
                    const c = cell(p.id, r);
                    return (
                      <td key={r.game.id} className="px-2 py-2 text-right font-mono">
                        {c ? (
                          <span style={{ borderBottom: `2px solid ${teamColor(c.teamNo)}` }}>{c.score ?? "—"}</span>
                        ) : (
                          <span className="text-muted">·</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-right font-mono font-bold">{p.avg ? p.avg.toFixed(1) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-1 text-xs text-muted">점수 밑줄 색 = 그 게임의 팀</p>
      </section>

      {totals.length > 0 && (
        <section className="px-4 pt-6">
          <h2 className="mb-2 text-sm font-bold">💸 정산 {!session.closed_at && "(진행 중 · 점수가 다 들어온 게임만)"}</h2>
          <ul className="overflow-hidden rounded-2xl border border-line">
            {totals.map((t) => (
              <li
                key={t.memberId}
                className={`flex items-center border-b border-line px-4 py-2.5 last:border-b-0 ${
                  t.memberId === meId ? "bg-amber-50" : ""
                }`}
              >
                <span className="font-bold">{nameOf(t.memberId)}</span>
                <span className={`ml-auto font-mono font-bold ${t.total > 0 ? "text-danger" : "text-muted"}`}>
                  {formatWon(t.total)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
