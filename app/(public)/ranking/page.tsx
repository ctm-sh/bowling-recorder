import Link from "next/link";
import { Empty, PageHeader } from "@/components/PageHeader";
import { tierLabel } from "@/components/TierBadge";
import { Segmented } from "@/components/ui";
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

  const winText = (m: (typeof rows)[number]) =>
    m.win.rate === null ? "승률 —" : `승률 ${Math.round(m.win.rate * 100)}%`;

  return (
    <div className="pb-6">
      <PageHeader
        eyebrow={sort === "win" ? "앱 팀전 기준 · 팀 1등 = 승" : `활동 회원 ${rows.length}명 · ${MIN_GAMES}게임 이상`}
        title="랭킹"
      />
      <Segmented
        label="정렬 기준"
        value={sort}
        options={(Object.keys(SORTS) as Sort[]).map((s) => ({
          key: s,
          label: SORTS[s],
          href: s === "avg" ? "/ranking" : `/ranking?sort=${s}`,
        }))}
        className="mx-5 mt-4"
      />

      {rows.length === 0 ? (
        <Empty>{sort === "win" ? "앱에서 기록한 게임이 아직 없어요." : "아직 랭킹에 들 회원이 없어요."}</Empty>
      ) : (
        <ol className="mx-5 mt-4 overflow-hidden rounded-2xl bg-surface">
          {rows.map((m, i) => {
            const me = m.id === meId;
            return (
              <li key={m.id} className={`border-b border-separator last:border-b-0 ${me ? "bg-accent-soft" : ""}`}>
                <Link href={`/members/${m.id}`} className="flex min-h-14 items-center gap-3 px-4 py-2">
                  <span className={`w-[22px] text-[17px] font-bold ${i < 3 ? "text-accent" : "text-muted"}`}>
                    {i + 1}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className={`truncate text-base ${me ? "font-bold" : "font-medium"}`}>{m.name}</span>
                    <span className="truncate text-xs text-muted">
                      {tierLabel(m.tier)} · {m.games}게임 ·{" "}
                      {sort === "win" ? `${m.win.wins}승 ${m.win.losses}패` : winText(m)}
                    </span>
                  </div>
                  <span className="flex flex-col items-end">
                    <span className="text-xl font-bold tracking-[-0.3px]">
                      {sort === "win"
                        ? `${Math.round((m.win.rate ?? 0) * 100)}%`
                        : (sort === "recent" ? m.recentAvg : m.avg)?.toFixed(1)}
                    </span>
                    {sort === "recent" && m.form !== null && Math.abs(m.form) >= 0.05 && (
                      <span className={`text-xs ${m.form > 0 ? "font-semibold text-accent" : "text-muted"}`}>
                        {m.form > 0 ? "+" : ""}
                        {m.form.toFixed(1)}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
