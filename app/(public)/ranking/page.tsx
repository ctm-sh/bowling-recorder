import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { TierBadge } from "@/components/TierBadge";
import { completeGames } from "@/lib/db/allGames";
import { listMembers } from "@/lib/db/members";
import { winRecord } from "@/lib/domain/stats";
import { getMeId } from "@/lib/me";

const SORTS = {
  avg: "전체 에버",
  recent: "최근 폼",
  win: "승률",
} as const;
type Sort = keyof typeof SORTS;

/** 전체 에버 랭킹에 넣을 최소 게임 수 */
const MIN_GAMES = 10;

export default async function RankingPage({ searchParams }: PageProps<"/ranking">) {
  const { sort: raw } = await searchParams;
  const sort: Sort = raw === "recent" || raw === "win" ? raw : "avg";
  const [members, games, meId] = await Promise.all([listMembers(), completeGames(), getMeId()]);

  const rows = members
    .filter((m) => m.active && m.games >= MIN_GAMES)
    .map((m) => {
      const win = winRecord(games, m.id);
      return { ...m, win, form: m.avg !== null && m.recentAvg !== null ? m.recentAvg - m.avg : null };
    })
    .filter((m) => sort !== "win" || m.win.played > 0)
    .sort((a, b) => {
      if (sort === "recent") return (b.recentAvg ?? 0) - (a.recentAvg ?? 0);
      if (sort === "win") return (b.win.rate ?? 0) - (a.win.rate ?? 0) || b.win.played - a.win.played;
      return (b.avg ?? 0) - (a.avg ?? 0);
    });

  return (
    <div className="pb-6">
      <PageHeader title="랭킹" />
      <nav className="sticky top-14 z-10 grid grid-cols-3 gap-1 border-b border-line bg-surface p-3 text-sm">
        {(Object.keys(SORTS) as Sort[]).map((s) => (
          <Link
            key={s}
            href={s === "avg" ? "/ranking" : `/ranking?sort=${s}`}
            aria-current={sort === s ? "page" : undefined}
            className={`rounded-lg py-2 text-center ${sort === s ? "bg-brand font-bold text-white" : "bg-background text-muted"}`}
          >
            {SORTS[s]}
          </Link>
        ))}
      </nav>
      <p className="px-4 pt-2 text-xs text-muted">
        {sort === "win"
          ? "앱에서 기록한 팀전 기준 (팀 1등 = 승)"
          : `활동 회원 중 ${MIN_GAMES}게임 이상 · ${sort === "recent" ? "최근 게임 에버" : "전체 에버"} 순`}
      </p>

      <ol className="mt-2">
        {rows.map((m, i) => (
          <li key={m.id} className={`border-b border-line ${m.id === meId ? "bg-amber-50" : ""}`}>
            <Link href={`/members/${m.id}`} className="flex items-center gap-3 px-4 py-3">
              <span className={`w-6 text-center font-mono font-bold ${i < 3 ? "text-brand" : "text-muted"}`}>
                {i + 1}
              </span>
              <TierBadge tier={m.tier} />
              <span className="font-bold">{m.name}</span>
              <span className="ml-auto text-right">
                <span className="block font-mono font-bold">
                  {sort === "win"
                    ? `${Math.round((m.win.rate ?? 0) * 100)}%`
                    : (sort === "recent" ? m.recentAvg : m.avg)?.toFixed(1)}
                </span>
                <span className="block text-xs text-muted">
                  {sort === "win" ? (
                    `${m.win.wins}승 ${m.win.losses}패`
                  ) : sort === "recent" && m.form !== null ? (
                    <span className={m.form >= 0 ? "text-green-700" : "text-danger"}>
                      {m.form >= 0 ? "▲" : "▼"}
                      {Math.abs(m.form).toFixed(1)}
                    </span>
                  ) : (
                    `${m.games}게임`
                  )}
                </span>
              </span>
            </Link>
          </li>
        ))}
        {rows.length === 0 && (
          <li className="p-8 text-center text-sm text-muted">
            {sort === "win" ? "앱에서 기록한 게임이 아직 없어요." : "아직 랭킹에 들 회원이 없어요."}
          </li>
        )}
      </ol>
    </div>
  );
}
