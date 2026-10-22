import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { TierBadge } from "@/components/TierBadge";
import { listMembers } from "@/lib/db/members";
import { getSessionResults } from "@/lib/db/results";
import { listSessions } from "@/lib/db/sessions";
import { formatDate, formatWon } from "@/lib/format";
import { getMeId } from "@/lib/me";
import { ChangeMe, WhoAmI } from "./WhoAmI";

export default async function HomePage() {
  const [meId, members, sessions] = await Promise.all([getMeId(), listMembers(), listSessions()]);
  const me = members.find((m) => m.id === meId);

  if (!me) {
    return (
      <>
        <PageHeader title="🎳 볼링 기록" />
        <WhoAmI members={members.filter((m) => m.active)} />
      </>
    );
  }

  // 게임이 있는 가장 최근 정모
  const latest = sessions.find((s) => s.gameCount > 0);
  const results = latest ? await getSessionResults(latest.id, latest.fee_per_game) : [];
  const mine = results
    .map((r) => {
      const team = r.ranked.find((t) => t.members.some((m) => m.memberId === me.id));
      if (!team) return null;
      const self = team.members.find((m) => m.memberId === me.id)!;
      return {
        gameNo: r.game.game_no,
        complete: r.complete,
        score: r.scores[me.id],
        handicap: self.handicap,
        rank: team.rank,
        teamCount: r.ranked.length,
        charge: r.charges.find((c) => c.memberId === me.id)?.amount ?? 0,
      };
    })
    .filter((g) => g !== null);
  const owed = mine.reduce((s, g) => s + g.charge, 0);
  const form = me.avg !== null && me.recentAvg !== null ? me.recentAvg - me.avg : null;

  return (
    <div className="pb-6">
      <PageHeader title="🎳 볼링 기록" action={<ChangeMe />} />

      <div className="m-4 flex items-center gap-2">
        <TierBadge tier={me.tier} />
        <span className="text-xl font-bold">{me.name}님</span>
      </div>

      <section className="mx-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-line p-4">
          <p className="text-xs text-muted">전체 에버</p>
          <p className="mt-1 text-2xl font-bold">{me.avg === null ? "—" : me.avg.toFixed(1)}</p>
        </div>
        <div className="rounded-2xl border border-line p-4">
          <p className="text-xs text-muted">최근 {me.recentGames}게임</p>
          <p className="mt-1 text-2xl font-bold">
            {me.recentAvg === null ? "—" : me.recentAvg.toFixed(1)}
            {form !== null && Math.abs(form) >= 0.05 && (
              <span className={`ml-1 text-sm ${form > 0 ? "text-green-700" : "text-danger"}`}>
                {form > 0 ? "▲" : "▼"}
                {Math.abs(form).toFixed(1)}
              </span>
            )}
          </p>
        </div>
      </section>

      {latest && mine.length > 0 ? (
        <section className="m-4 overflow-hidden rounded-2xl border border-line">
          <div className="flex items-center justify-between bg-[#0b0f1a] px-4 py-3 text-white">
            <span className="font-bold">{formatDate(latest.date)} 정모</span>
            <span className="text-xs text-gray-400">{latest.closed_at ? "마감" : "진행 중"}</span>
          </div>
          <ul>
            {mine.map((g) => (
              <li key={g.gameNo} className="flex items-center gap-2 border-b border-line px-4 py-3 text-sm">
                <span className="text-muted">{g.gameNo}게임</span>
                <span className="font-mono text-lg font-bold">
                  {g.score ?? "—"}
                  {g.handicap > 0 && <span className="text-xs font-normal text-muted">+{g.handicap}</span>}
                </span>
                {g.complete ? (
                  <>
                    <span className={`text-xs font-bold ${g.rank === 1 ? "text-green-700" : "text-danger"}`}>
                      {g.rank === 1 ? "승" : g.rank === g.teamCount ? "패" : `${g.rank}위`}
                    </span>
                    <span className={`ml-auto font-mono ${g.charge > 0 ? "text-danger" : "text-muted"}`}>
                      {formatWon(g.charge)}
                    </span>
                  </>
                ) : (
                  <span className="ml-auto text-xs text-muted">입력 중</span>
                )}
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm font-bold">💸 내가 낼 금액</span>
            <span className={`font-mono text-2xl font-bold ${owed > 0 ? "text-danger" : "text-green-700"}`}>
              {owed > 0 ? formatWon(owed) : "0원 🎉"}
            </span>
          </div>
          <Link
            href={`/results/${latest.id}`}
            className="block border-t border-line py-3 text-center text-sm font-bold text-brand"
          >
            이 정모 전체 결과 보기 →
          </Link>
        </section>
      ) : (
        <p className="m-4 rounded-xl bg-background p-4 text-sm text-muted">
          {latest ? `${formatDate(latest.date)} 정모에는 참여하지 않았어요.` : "아직 앱으로 기록한 정모가 없어요."}
        </p>
      )}

      <Link href="/me" className="mx-4 block rounded-xl bg-brand-soft py-3 text-center text-sm font-bold text-brand">
        내 승률·상대 전적 보기
      </Link>
    </div>
  );
}
