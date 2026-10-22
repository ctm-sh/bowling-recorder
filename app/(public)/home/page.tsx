import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { TierBadge } from "@/components/TierBadge";
import { TEAM_NAME } from "@/lib/brand";
import { listMembers } from "@/lib/db/members";
import { getSessionResults } from "@/lib/db/results";
import { listSessions } from "@/lib/db/sessions";
import { formatDate, formatWon } from "@/lib/format";
import { getMeId } from "@/lib/me";
import { ChangeMe, WhoAmI } from "../WhoAmI";

const MENU = [
  { href: "/results", icon: "🎳", title: "결과", desc: "정모별 게임 결과·정산" },
  { href: "/me", icon: "📈", title: "내 기록", desc: "에버·승률·상대 전적" },
  { href: "/ranking", icon: "🏆", title: "랭킹", desc: "에버·폼·승률 순위" },
];

export default async function HomePage({ searchParams }: PageProps<"/home">) {
  const { pick } = await searchParams;
  const [meId, members, sessions] = await Promise.all([getMeId(), listMembers(), listSessions()]);
  const me = pick ? undefined : members.find((m) => m.id === meId);

  if (!me) {
    return (
      <>
        <PageHeader title={`🎳 ${TEAM_NAME}`} back="/" />
        <WhoAmI members={members.filter((m) => m.active)} />
      </>
    );
  }

  // 게임이 있는 가장 최근 정모에서 내 게임
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

  return (
    <div className="pb-6">
      <PageHeader title={`🎳 ${TEAM_NAME}`} back="/" action={<ChangeMe />} />

      <div className="mx-4 mt-5 flex items-center gap-2">
        <TierBadge tier={me.tier} />
        <span className="text-2xl font-bold">{me.name}님</span>
        <span className="text-2xl" aria-hidden>
          👋
        </span>
      </div>

      {latest && mine.length > 0 ? (
        <section className="m-4 overflow-hidden rounded-2xl border border-line shadow-sm">
          <div className="flex items-center justify-between bg-[#0b0f1a] px-4 py-3 text-white">
            <span className="font-bold">{formatDate(latest.date)} 정모</span>
            <span className="text-xs text-gray-400">{latest.closed_at ? "마감" : "진행 중"}</span>
          </div>
          <ul>
            {mine.map((g) => (
              <li key={g.gameNo} className="flex items-center gap-2 border-b border-line px-4 py-3 text-sm">
                <span className="w-12 text-muted">{g.gameNo}게임</span>
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
            이 정모 전체 결과 보기 ›
          </Link>
        </section>
      ) : (
        <p className="m-4 rounded-2xl bg-background p-5 text-center text-sm text-muted">
          {latest ? `${formatDate(latest.date)} 정모에는 참여하지 않았어요.` : "아직 기록된 정모가 없어요."}
        </p>
      )}

      <nav className="mx-4 mt-2 grid grid-cols-3 gap-2">
        {MENU.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="flex flex-col items-center gap-1 rounded-2xl border border-line bg-surface px-2 py-4 text-center shadow-sm active:bg-background"
          >
            <span className="text-3xl" aria-hidden>
              {m.icon}
            </span>
            <span className="font-bold">{m.title}</span>
            <span className="text-[11px] leading-tight text-muted">{m.desc}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
