import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { GroupLabel, ListCard, Pill, primaryButton } from "@/components/ui";
import { listMembers } from "@/lib/db/members";
import { getSessionResults } from "@/lib/db/results";
import { listSessions } from "@/lib/db/sessions";
import { tierCandidates } from "@/lib/domain/tiers";
import { formatDateLong } from "@/lib/format";

export default async function AdminHomePage() {
  const [members, sessions] = await Promise.all([listMembers(), listSessions()]);
  const open = sessions.filter((s) => !s.closed_at);
  const recentClosed = sessions.filter((s) => s.closed_at).slice(0, 3);
  const candidates = Object.values(tierCandidates(members));
  const ups = candidates.filter((k) => k === "up").length;
  const downs = candidates.length - ups;

  // 진행 중 정모마다 게임별 점수 입력 상태 (이어서 입력할 게임 찾기)
  const progress = await Promise.all(open.map((s) => getSessionResults(s.id, s.fee_per_game)));

  return (
    <div className="pb-6">
      <PageHeader
        eyebrow={<Pill>운영진</Pill>}
        title="홈"
        action={
          <Link href="/home" className="flex min-h-11 items-center text-[15px] text-link">
            회원 화면 보기
          </Link>
        }
      />

      <div className="flex flex-col gap-3 px-5 pt-4">
        {open.map((s, i) => {
          const games = progress[i];
          const pending = games.find((g) => !g.complete);
          return (
            <section key={s.id} className="flex flex-col gap-4 rounded-[18px] bg-surface p-5">
              <div className="flex flex-col gap-1">
                <span className="text-[13px] font-semibold text-accent">진행 중</span>
                <span className="text-[22px] font-bold tracking-[-0.4px]">{formatDateLong(s.date)} 정모</span>
                <span className="text-sm text-muted">
                  {s.attendeeCount}명 참석 ·{" "}
                  {pending ? `${pending.game.game_no}게임 점수 입력 대기` : `${games.length}게임 완료`}
                </span>
              </div>
              {games.length > 0 && (
                <div
                  className="flex gap-1.5"
                  aria-label={`진행 단계: ${games.map((g) => `${g.game.game_no}게임 ${g.complete ? "완료" : "진행 중"}`).join(", ")}`}
                >
                  {games.map((g) => (
                    <div
                      key={g.game.id}
                      className={`h-1.5 flex-1 rounded-[3px] bg-accent ${g.complete ? "" : "opacity-40"}`}
                    />
                  ))}
                </div>
              )}
              <Link
                href={pending ? `/admin/sessions/${s.id}/games/${pending.game.id}/scores` : `/admin/sessions/${s.id}`}
                className={primaryButton}
              >
                {pending ? `${pending.game.game_no}게임 점수 입력 이어하기` : "정모 이어하기"}
              </Link>
            </section>
          );
        })}

        <MenuCard
          href="/admin/sessions/new"
          icon={
            <span className="flex size-10 items-center justify-center rounded-full bg-accent-soft text-accent">
              <Icon name="plus" size={20} strokeWidth={2} />
            </span>
          }
          title="새 정모 시작"
          sub="날짜, 참석자, 게임비 설정"
        />

        {candidates.length > 0 && (
          <MenuCard
            href="/admin/members"
            icon={
              <span className="flex size-10 items-center justify-center rounded-full bg-foreground text-[17px] font-bold text-white">
                {candidates.length}
              </span>
            }
            title="티어 심사 대기"
            sub={[ups > 0 && `승급 후보 ${ups}명`, downs > 0 && `강등 후보 ${downs}명`].filter(Boolean).join(" · ")}
          />
        )}

        {recentClosed.length > 0 && (
          <>
            <GroupLabel className="pt-2">최근 정모</GroupLabel>
            <ListCard className="rounded-[18px]">
              {recentClosed.map((s) => (
                <Link
                  key={s.id}
                  href={`/admin/sessions/${s.id}/settlement`}
                  className="flex min-h-14 items-center gap-3 px-5"
                >
                  <span className="flex-1 text-base">{formatDateLong(s.date)}</span>
                  <span className="text-[13px] text-muted">
                    {s.attendeeCount}명 · {s.gameCount}게임
                  </span>
                  {/* TODO(디자인): 시안의 정모별 "시트 반영됨" 표시는 정모마다 기록하지 않아 넣지 않았다 */}
                  <Icon name="chevronRight" size={16} strokeWidth={2.4} className="text-[#c7c7cc]" />
                </Link>
              ))}
            </ListCard>
          </>
        )}
      </div>
    </div>
  );
}

function MenuCard({ href, icon, title, sub }: { href: string; icon: ReactNode; title: string; sub: string }) {
  return (
    <Link href={href} className="flex min-h-11 items-center gap-3.5 rounded-[18px] bg-surface px-5 py-4">
      {icon}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[17px] font-semibold">{title}</span>
        <span className="text-[13px] text-muted">{sub}</span>
      </span>
      <Icon name="chevronRight" size={16} strokeWidth={2.4} className="text-[#c7c7cc]" />
    </Link>
  );
}
