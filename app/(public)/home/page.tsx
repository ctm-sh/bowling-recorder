import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { tierLabel } from "@/components/TierBadge";
import { Card, Pill } from "@/components/ui";
import { completeGames } from "@/lib/db/allGames";
import { listMembers } from "@/lib/db/members";
import { getSessionResults } from "@/lib/db/results";
import { listSessions } from "@/lib/db/sessions";
import { getSettings } from "@/lib/db/settings";
import { winRecord } from "@/lib/domain/stats";
import { formatAmount, formatDateLong } from "@/lib/format";
import { getMeId } from "@/lib/me";
import { WhoAmI } from "../WhoAmI";

const round1 = (n: number) => (Math.round(n * 10) / 10).toFixed(1);

export default async function HomePage({ searchParams }: PageProps<"/home">) {
  const { pick } = await searchParams;
  const [meId, members, sessions] = await Promise.all([getMeId(), listMembers(), listSessions()]);
  const me = pick ? undefined : members.find((m) => m.id === meId);

  if (!me) {
    return (
      <WhoAmI
        members={members.filter((m) => m.active)}
        currentId={meId ?? undefined}
        back={meId ? "/home" : "/"}
        backLabel={meId ? "홈" : "처음으로"}
      />
    );
  }

  // 게임이 있는 가장 최근 정모에서 내 게임
  const latest = sessions.find((s) => s.gameCount > 0);
  const [results, games, settings] = await Promise.all([
    latest ? getSessionResults(latest.id, latest.fee_per_game) : Promise.resolve([]),
    completeGames(),
    getSettings(),
  ]);
  const mine = results
    .map((r) => {
      const team = r.ranked.find((t) => t.members.some((m) => m.memberId === me.id));
      if (!team) return null;
      return {
        gameNo: r.game.game_no,
        complete: r.complete,
        score: r.scores[me.id],
        rank: team.rank,
        charge: r.charges.find((c) => c.memberId === me.id)?.amount ?? 0,
      };
    })
    .filter((g) => g !== null);
  const owed = mine.reduce((s, g) => s + g.charge, 0);
  const win = winRecord(games, me.id);
  const form = me.avg !== null && me.recentAvg !== null ? me.recentAvg - me.avg : null;

  return (
    <div className="pb-6">
      <PageHeader
        eyebrow={`${tierLabel(me.tier)} · ${me.name}`}
        title="홈"
        action={
          // 이름 고르기 화면으로 (다른 이름으로 바꿀 때)
          <Link
            href="/home?pick=1"
            className="flex min-h-11 items-center gap-1.5 rounded-full bg-surface px-4 text-sm font-semibold text-link"
          >
            <Icon name="swap" size={16} strokeWidth={2} />
            다른 떼굴러로 보기
          </Link>
        }
      />

      <div className="flex flex-col gap-3 px-5 pt-4">
        <section className="flex flex-col gap-4 rounded-[18px] bg-black p-5 text-white">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-semibold text-dark-muted">
              {latest ? `최근 정모 · ${formatDateLong(latest.date)} · ${latest.gameCount}게임` : "최근 정모"}
            </span>
            {latest && <Pill tone="light">{latest.closed_at ? "마감" : "진행 중"}</Pill>}
          </div>

          {latest && mine.length > 0 ? (
            <>
              <div className="flex flex-col gap-0.5">
                <span className="text-[13px] text-dark-muted">내가 낼 금액</span>
                <span className="text-5xl leading-[1.07] font-bold tracking-[-1px]">
                  {formatAmount(owed)}
                  <span className="text-[22px] font-semibold">원</span>
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {mine.map((g) => (
                  <div
                    key={g.gameNo}
                    className="flex flex-col items-center gap-0.5 rounded-[11px] bg-dark-surface py-2.5"
                  >
                    <span className="text-[11px] text-dark-muted">{g.gameNo}게임</span>
                    <span className="text-xl font-bold">{g.score ?? "—"}</span>
                    {g.complete ? (
                      <span
                        className={`text-[11px] ${g.rank === 1 ? "font-semibold text-dark-link" : "text-dark-muted"}`}
                      >
                        {g.rank}등
                      </span>
                    ) : (
                      <span className="text-[11px] text-dark-muted">입력 중</span>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-[15px] text-dark-muted">
              {latest ? "이번 정모에는 참여하지 않았어요." : "아직 기록된 정모가 없어요."}
            </p>
          )}

          {latest && (
            <Link
              href={`/results/${latest.id}`}
              className="flex min-h-11 items-center justify-between border-t border-dark-separator pt-1 text-[15px] text-dark-link"
            >
              <span>게임별 전체 결과 보기</span>
              <Icon name="chevronRight" size={16} strokeWidth={2} />
            </Link>
          )}
        </section>

        <Card className="flex flex-col gap-3.5 px-5 py-[18px]">
          <div className="flex items-center justify-between">
            <span className="text-[17px] font-semibold">내 기록</span>
            <Link href="/me" className="text-[15px] text-link">
              자세히
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Stat label="전체 에버" value={me.avg === null ? "—" : round1(me.avg)} />
            <Stat
              label={`최근 ${settings.recent_n}게임`}
              value={me.recentAvg === null ? "—" : round1(me.recentAvg)}
              note={
                form !== null && Math.abs(form) >= 0.05 ? (
                  <span className={form > 0 ? "font-semibold text-accent" : "text-muted"}>
                    {form > 0 ? `+${round1(form)} 상승` : `${round1(form)} 하락`}
                  </span>
                ) : undefined
              }
            />
            <Stat
              label="승률"
              value={win.rate === null ? "—" : `${Math.round(win.rate * 100)}%`}
              note={win.played > 0 ? `${win.wins}승 ${win.losses}패` : undefined}
            />
          </div>
        </Card>
        {/* TODO(디자인): 시안의 "다음 정모" 카드는 아직 없는 기능이라 넣지 않았다 */}
      </div>
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-xs text-muted">{label}</span>
      <span className="text-2xl font-bold tracking-[-0.4px]">{value}</span>
      {note && <span className="text-xs text-muted">{note}</span>}
    </div>
  );
}
