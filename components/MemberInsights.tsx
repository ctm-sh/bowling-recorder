import Link from "next/link";
import type { ReactNode } from "react";
import { tierLabel } from "@/components/TierBadge";
import { formatDateLong } from "@/lib/format";
import type { memberInsights } from "@/lib/insights";
import { Icon } from "./Icon";
import { SectionTitle } from "./ui";

type Insights = ReturnType<typeof memberInsights>;

function pct(wins: number, losses: number) {
  return wins + losses === 0 ? null : Math.round((wins / (wins + losses)) * 100);
}

function recordText({ wins, losses, draws }: { wins: number; losses: number; draws: number }) {
  return `${wins}승 ${losses}패${draws > 0 ? ` ${draws}무` : ""}`;
}

function StatCard({ label, value, note }: { label: string; value: string; note?: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-2xl bg-surface px-4 py-3.5">
      <span className="text-xs text-muted">{label}</span>
      <span className="text-[28px] font-bold tracking-[-0.5px]">{value}</span>
      {note && <span className="text-xs text-muted">{note}</span>}
    </div>
  );
}

// 에버·폼·승률·상대 전적·최근 게임. 운영진 회원 상세와 회원 "내 기록"에서 함께 쓴다.
export function MemberInsights({
  avg,
  recentAvg,
  recentGames,
  recentN,
  insights,
  legacy,
  nameOf,
  tierOf,
  profileHref,
}: {
  avg: number | null;
  games: number;
  recentAvg: number | null;
  recentGames: number;
  recentN: number;
  insights: Insights;
  /** 엑셀에서 가져온 이전 기록 (오래된 순) */
  legacy: number[];
  nameOf: (memberId: string) => string;
  tierOf: (memberId: string) => number | null;
  /** 상대 이름을 누르면 갈 곳 (없으면 링크 없음) */
  profileHref?: (memberId: string) => string;
}) {
  const form = avg !== null && recentAvg !== null ? recentAvg - avg : null;
  const { win, opponents, byTier, allGames } = insights;
  const shown = allGames.slice(0, 10);
  const more = allGames.slice(10);

  // 오래된 순 전체 점수: 엑셀 이전 기록 → 앱 게임
  const timeline = [...legacy, ...[...allGames].reverse().map((g) => g.score)];
  const best = timeline.length ? Math.max(...timeline) : null;
  const recent = timeline.slice(-recentN);
  const vsTotal = opponents.reduce(
    (s, o) => ({ wins: s.wins + o.wins, losses: s.losses + o.losses, draws: s.draws + o.draws }),
    { wins: 0, losses: 0, draws: 0 },
  );
  const vsPct = pct(vsTotal.wins, vsTotal.losses);

  return (
    <>
      <section className="grid grid-cols-2 gap-2.5 px-5 pt-4">
        <StatCard
          label="전체 에버"
          value={avg === null ? "—" : avg.toFixed(1)}
          note={best !== null && `최고 ${best}`}
        />
        <StatCard
          label={`최근 ${Math.min(recentN, recentGames)}게임`}
          value={recentAvg === null ? "—" : recentAvg.toFixed(1)}
          note={
            form !== null &&
            Math.abs(form) >= 0.05 && (
              <span className={form > 0 ? "font-semibold text-accent" : ""}>
                폼 {form > 0 ? "+" : ""}
                {form.toFixed(1)}
              </span>
            )
          }
        />
        <StatCard
          label="승률"
          value={win.rate === null ? "—" : `${Math.round(win.rate * 100)}%`}
          note={`${win.wins}승 ${win.losses}패 · 팀 1등만 승`}
        />
        <StatCard
          label="상대 전적"
          value={vsPct === null ? "—" : `${vsPct}%`}
          note={opponents.length > 0 ? recordText(vsTotal) : "기록 없음"}
        />
      </section>

      {recent.length > 0 && avg !== null && <RecentBars scores={recent} avg={avg} />}

      <SectionTitle note="같은 묶음끼리 · 점수+받은 핸디">상대별 전적</SectionTitle>
      {byTier.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 px-5 pb-2 text-xs">
          {byTier.map((t) => (
            <li key={t.tier} className="rounded-full bg-fill px-2.5 py-1">
              <span className="text-muted">{tierLabel(t.tier)}</span> {recordText(t)}
            </li>
          ))}
        </ul>
      )}
      {opponents.length === 0 ? (
        <p className="mx-5 rounded-2xl bg-surface p-4 text-[15px] text-muted">아직 앱에서 기록한 맞대결이 없어요.</p>
      ) : (
        <div className="mx-5 overflow-hidden rounded-2xl bg-surface">
          {opponents.map((o) => {
            const last = o.recent[0];
            const p = pct(o.wins, o.losses) ?? 0;
            return (
              <details key={o.opponentId} className="group border-b border-separator last:border-b-0">
                <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3">
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-base font-semibold">
                      {profileHref ? (
                        <Link href={profileHref(o.opponentId)} className="underline-offset-2 hover:underline">
                          {nameOf(o.opponentId)}
                        </Link>
                      ) : (
                        nameOf(o.opponentId)
                      )}{" "}
                      <span className="text-xs font-normal text-muted">{tierLabel(tierOf(o.opponentId))}</span>
                    </span>
                    {last && (
                      <span className="text-xs text-muted">
                        최근 {last.my.score}+{last.my.handicap} vs {last.their.score}+{last.their.handicap}{" "}
                        {last.result === "W" ? "승" : last.result === "L" ? "패" : "무"}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-base font-bold">{recordText(o)}</span>
                    <div className="h-1 w-[72px] overflow-hidden rounded-sm bg-fill">
                      <div className="h-1 bg-accent" style={{ width: `${p}%` }} />
                    </div>
                  </div>
                </summary>
                <ul className="flex flex-col gap-1 px-4 pb-3 text-xs text-muted">
                  {o.recent.slice(0, 5).map((m) => (
                    <li key={m.gameId} className="flex justify-between">
                      <span>
                        {formatDateLong(m.date)} · {m.gameNo}게임
                      </span>
                      <span>
                        {m.my.score}+{m.my.handicap} vs {m.their.score}+{m.their.handicap}{" "}
                        <b className={m.result === "W" ? "text-accent" : "text-foreground"}>
                          {m.result === "W" ? "승" : m.result === "L" ? "패" : "무"}
                        </b>
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            );
          })}
        </div>
      )}

      <SectionTitle note={`앱 ${allGames.length}게임`}>최근 게임</SectionTitle>
      {allGames.length === 0 ? (
        <p className="mx-5 rounded-2xl bg-surface p-4 text-[15px] text-muted">앱에서 기록한 게임이 아직 없어요.</p>
      ) : (
        <div className="mx-5 overflow-hidden rounded-2xl bg-surface">
          <GameList games={shown} />
          {more.length > 0 && (
            <details className="group">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-center border-t border-separator text-[15px] text-link group-open:hidden">
                전체 {allGames.length}게임 보기
              </summary>
              <GameList games={more} />
            </details>
          )}
        </div>
      )}

      {legacy.length > 0 && (
        <details className="group mx-5 mt-6 rounded-2xl bg-surface">
          <summary className="flex min-h-[52px] cursor-pointer list-none items-center gap-2 px-4">
            <span className="text-[15px] font-semibold">앱 이전 기록 (엑셀)</span>
            <span className="text-[13px] text-muted">
              {legacy.length}게임 · 평균 {(legacy.reduce((a, b) => a + b, 0) / legacy.length).toFixed(1)}
            </span>
            <Icon
              name="chevronRight"
              size={16}
              strokeWidth={2.4}
              className="ml-auto text-[#c7c7cc] transition-transform group-open:rotate-90"
            />
          </summary>
          <p className="px-4 text-xs text-muted">날짜·팀 정보 없이 기록된 순서대로예요.</p>
          <ol className="grid grid-cols-5 gap-1.5 p-4 text-sm">
            {legacy.map((s, i) => (
              <li key={i} className="rounded-lg bg-background py-1.5 text-center">
                {s}
              </li>
            ))}
          </ol>
        </details>
      )}
    </>
  );
}

/** 최근 N게임 막대 그래프. 점선 = 전체 에버, 에버 이상이면 파랑. */
function RecentBars({ scores, avg }: { scores: number[]; avg: number }) {
  const lo = Math.min(...scores, avg) - 20;
  const hi = Math.max(...scores, avg);
  const height = (n: number) => Math.max(4, Math.round(((n - lo) / (hi - lo || 1)) * 96));
  return (
    <div className="mx-5 mt-2.5 flex flex-col gap-2.5 rounded-2xl bg-surface p-4">
      <div className="flex items-baseline justify-between">
        <span className="text-[15px] font-semibold">최근 {scores.length}게임</span>
        <span className="text-xs text-muted">선 = 전체 에버 {Math.round(avg)}</span>
      </div>
      <div
        role="img"
        aria-label={`최근 ${scores.length}게임 점수 막대 그래프, 최저 ${Math.min(...scores)} 최고 ${Math.max(...scores)}`}
        className="relative flex h-24 items-end gap-1"
      >
        <div className="absolute inset-x-0 border-t border-dashed border-[#c7c7cc]" style={{ bottom: height(avg) }} />
        {scores.map((s, i) => (
          <div
            key={i}
            className={`flex-1 rounded-t-[3px] ${s >= avg ? "bg-accent" : "bg-[#c7c7cc]"}`}
            style={{ height: height(s) }}
          />
        ))}
      </div>
    </div>
  );
}

function GameList({ games }: { games: Insights["allGames"] }) {
  return (
    <ul>
      {games.map((g) => (
        <li
          key={g.gameId}
          className="flex min-h-[52px] items-center gap-3 border-t border-separator px-4 first:border-t-0"
        >
          <span className="flex-1 text-[15px]">
            {formatDateLong(g.date).split(" (")[0]} · {g.gameNo}게임
          </span>
          <span className={`w-12 text-right text-[13px] font-semibold ${g.rank === 1 ? "text-accent" : "text-muted"}`}>
            {g.rank}등
          </span>
          <span className="w-14 text-right text-[17px] font-bold">
            {g.score}
            {g.handicap > 0 && <span className="text-xs font-normal text-muted">+{g.handicap}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}
