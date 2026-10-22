import Link from "next/link";
import { TierBadge } from "@/components/TierBadge";
import { formatDate } from "@/lib/format";
import type { memberInsights } from "@/lib/insights";

type Insights = ReturnType<typeof memberInsights>;

function pct(rate: number | null) {
  return rate === null ? "—" : `${Math.round(rate * 100)}%`;
}

function Record3({ wins, losses, draws }: { wins: number; losses: number; draws: number }) {
  return (
    <span className="font-mono">
      <span className="text-green-700">{wins}승</span> <span className="text-danger">{losses}패</span>
      {draws > 0 && <span className="text-muted"> {draws}무</span>}
    </span>
  );
}

// 에버·폼·승률·상대 전적·최근 게임. 운영진 회원 상세와 회원 "내 기록"에서 함께 쓴다.
export function MemberInsights({
  avg,
  games,
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

  return (
    <>
      <section className="mx-4 mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-line p-4">
          <p className="text-xs text-muted">전체 에버 · {games}게임</p>
          <p className="mt-1 text-2xl font-bold">{avg === null ? "—" : avg.toFixed(1)}</p>
        </div>
        <div className="rounded-2xl border border-line p-4">
          <p className="text-xs text-muted">최근 {Math.min(recentN, recentGames)}게임 에버</p>
          <p className="mt-1 text-2xl font-bold">
            {recentAvg === null ? "—" : recentAvg.toFixed(1)}
            {form !== null && Math.abs(form) >= 0.05 && (
              <span className={`ml-1 text-sm ${form > 0 ? "text-green-700" : "text-danger"}`}>
                {form > 0 ? "▲" : "▼"}
                {Math.abs(form).toFixed(1)}
              </span>
            )}
          </p>
        </div>
        <div className="col-span-2 rounded-2xl border border-line p-4">
          <p className="text-xs text-muted">팀전 승률 (팀 1등 = 승) · 앱 기록 {win.played}게임</p>
          <p className="mt-1 text-2xl font-bold">
            {pct(win.rate)}{" "}
            <span className="text-base font-normal text-muted">
              {win.wins}승 {win.losses}패
            </span>
          </p>
        </div>
      </section>

      <section className="px-4 pt-6">
        <h2 className="mb-1 text-sm font-bold">상대 전적</h2>
        <p className="mb-2 text-xs text-muted">팀 나눌 때 맞붙은 상대와 개인 점수 + 받은 핸디로 비교해요.</p>
        {byTier.length > 0 && (
          <ul className="mb-3 flex flex-wrap gap-2 text-xs">
            {byTier.map((t) => (
              <li key={t.tier} className="flex items-center gap-1 rounded-full bg-background px-2 py-1">
                <TierBadge tier={t.tier} />
                <Record3 {...t} />
              </li>
            ))}
          </ul>
        )}
        {opponents.length === 0 ? (
          <p className="rounded-xl bg-background p-4 text-sm text-muted">아직 앱에서 기록한 맞대결이 없어요.</p>
        ) : (
          <ul className="overflow-hidden rounded-2xl border border-line">
            {opponents.map((o) => (
              <li key={o.opponentId} className="border-b border-line px-4 py-3 last:border-b-0">
                <details>
                  <summary className="flex cursor-pointer list-none items-center gap-2">
                    <TierBadge tier={tierOf(o.opponentId)} />
                    {profileHref ? (
                      <Link href={profileHref(o.opponentId)} className="font-bold underline-offset-2 hover:underline">
                        {nameOf(o.opponentId)}
                      </Link>
                    ) : (
                      <span className="font-bold">{nameOf(o.opponentId)}</span>
                    )}
                    <span className="ml-auto text-sm">
                      <Record3 {...o} />
                    </span>
                  </summary>
                  <ul className="mt-2 flex flex-col gap-1 text-xs text-muted">
                    {o.recent.slice(0, 5).map((m) => (
                      <li key={`${m.gameId}`} className="flex justify-between font-mono">
                        <span className="font-sans">
                          {formatDate(m.date)} {m.gameNo}게임
                        </span>
                        <span>
                          {m.my.score}+{m.my.handicap} vs {m.their.score}+{m.their.handicap}{" "}
                          <b className={m.result === "W" ? "text-green-700" : m.result === "L" ? "text-danger" : ""}>
                            {m.result === "W" ? "승" : m.result === "L" ? "패" : "무"}
                          </b>
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="px-4 pt-6">
        <h2 className="mb-2 text-sm font-bold">
          게임 기록 <span className="font-normal text-muted">· 앱 {allGames.length}게임</span>
        </h2>
        {allGames.length === 0 ? (
          <p className="rounded-xl bg-background p-4 text-sm text-muted">앱에서 기록한 게임이 아직 없어요.</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-line text-sm">
            <GameList games={shown} />
            {more.length > 0 && (
              <details className="group">
                <summary className="cursor-pointer list-none border-t border-line py-3 text-center font-bold text-brand group-open:hidden">
                  전체 {allGames.length}게임 보기 ▾
                </summary>
                <GameList games={more} />
              </details>
            )}
          </div>
        )}
      </section>

      {legacy.length > 0 && (
        <section className="px-4 pt-6">
          <details className="rounded-2xl border border-line">
            <summary className="flex cursor-pointer list-none items-center px-4 py-3 text-sm">
              <span className="font-bold">앱 이전 기록 (엑셀)</span>
              <span className="ml-2 text-muted">
                {legacy.length}게임 · 평균 {(legacy.reduce((a, b) => a + b, 0) / legacy.length).toFixed(1)}
              </span>
              <span className="ml-auto text-muted">▾</span>
            </summary>
            <p className="px-4 text-xs text-muted">날짜·팀 정보 없이 기록된 순서대로예요.</p>
            <ol className="grid grid-cols-5 gap-1.5 p-4 font-mono text-sm">
              {legacy.map((s, i) => (
                <li key={i} className="rounded-lg bg-background py-1.5 text-center">
                  {s}
                </li>
              ))}
            </ol>
          </details>
        </section>
      )}
    </>
  );
}

function GameList({ games }: { games: Insights["allGames"] }) {
  return (
    <ul>
      {games.map((g) => (
        <li key={g.gameId} className="flex items-center gap-2 border-t border-line px-4 py-2.5 first:border-t-0">
          <span className="text-muted">
            {formatDate(g.date)} {g.gameNo}게임
          </span>
          <span className="ml-auto font-mono font-bold">
            {g.score}
            {g.handicap > 0 && <span className="text-xs font-normal text-muted">+{g.handicap}</span>}
          </span>
          <span className={`w-10 text-right text-xs font-bold ${g.rank === 1 ? "text-green-700" : "text-danger"}`}>
            {g.rank === 1 ? "승" : g.rank === g.teamCount ? "패" : `${g.rank}위`}
          </span>
        </li>
      ))}
    </ul>
  );
}
