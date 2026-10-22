import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/ActionButton";
import { CopyButton } from "@/components/CopyButton";
import { BottomBar } from "@/components/Flow";
import { Icon } from "@/components/Icon";
import { Empty, PageHeader } from "@/components/PageHeader";
import { teamName } from "@/components/TeamBadge";
import { GroupLabel, primaryButton } from "@/components/ui";
import { TEAM_NAME } from "@/lib/brand";
import { listMembers } from "@/lib/db/members";
import { getSessionResults } from "@/lib/db/results";
import { getSession } from "@/lib/db/sessions";
import { getSettings } from "@/lib/db/settings";
import { settlementText, totalsByMember } from "@/lib/domain/settlement";
import { formatAmount, formatDate, formatDateLong, formatWon } from "@/lib/format";
import { closeSession, reopenSession } from "../close-actions";

/** 시트 반영 시각 (한국 시간 HH:MM) */
function syncedAt(iso: string) {
  return new Date(iso).toLocaleTimeString("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default async function SettlementPage({ params }: PageProps<"/admin/sessions/[id]/settlement">) {
  const { id } = await params;
  const data = await getSession(id);
  if (!data) notFound();
  const { session } = data;
  const [results, members, settings] = await Promise.all([
    getSessionResults(id, session.fee_per_game),
    listMembers(),
    getSettings(),
  ]);

  const names = new Map(members.map((m) => [m.id, m.name]));
  const nameOf = (m: string) => names.get(m) ?? "?";
  const done = results.filter((r) => r.complete);
  const incomplete = results.filter((r) => !r.complete);
  const games = done.map((r) => ({ gameNo: r.game.game_no, ranked: r.ranked, charges: r.charges }));
  const totals = totalsByMember(games);
  const sum = totals.reduce((s, t) => s + t.total, 0);
  const plays = done.reduce((s, r) => s + r.ranked.reduce((n, t) => n + t.members.length, 0), 0);
  const actualCost = plays * session.fee_per_game;
  const text = settlementText({ title: `${TEAM_NAME} ${formatDate(session.date)}`, games, nameOf });
  const closed = !!session.closed_at;
  const perGame = (memberId: string) =>
    done.map((r) => formatAmount(r.charges.find((c) => c.memberId === memberId)?.amount ?? 0)).join(" · ");

  return (
    <div className="screen-dark min-h-dvh bg-black text-white">
      <PageHeader
        dark
        back={`/admin/sessions/${id}`}
        backLabel="정모"
        topRight={
          <Link href="/admin" className="flex min-h-11 items-center text-[17px] font-semibold text-dark-link">
            완료
          </Link>
        }
        eyebrow={`${formatDateLong(session.date).split(" (")[0]} 정모 ${closed ? "마감" : "진행 중 · 미리보기"} · ${done.length}게임 · ${totals.length}명`}
        title="정산"
        sub={
          <>
            <span className="block text-5xl leading-[1.1] font-bold tracking-[-1px] text-white">
              {formatAmount(sum)}
              <span className="text-[22px]">원</span>
            </span>
            <span className="mt-1 block text-[13px]">
              {formatWon(session.fee_per_game)} × {plays}게임 · 1/N은 100원 단위 올림
              {sum !== actualCost && ` (차액 ${formatWon(sum - actualCost)})`}
            </span>
          </>
        }
      />

      {incomplete.length > 0 && (
        <p className="mx-5 mt-4 rounded-xl border border-dark-separator px-4 py-3 text-sm text-dark-muted">
          점수가 덜 들어간 게임은 정산에서 빠졌어요: {incomplete.map((r) => `${r.game.game_no}게임`).join(", ")}
        </p>
      )}

      {totals.length === 0 ? (
        <Empty dark>정산할 게임이 없어요.</Empty>
      ) : (
        <div className="mx-5 mt-5 overflow-hidden rounded-2xl bg-dark-surface">
          {totals.map((t) => (
            <div
              key={t.memberId}
              className="flex min-h-[52px] items-center gap-3 border-b border-dark-separator px-4 py-1.5 last:border-b-0"
            >
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-base font-medium">{nameOf(t.memberId)}</span>
                <span className="truncate text-[11px] text-dark-muted">게임별 {perGame(t.memberId)}</span>
              </div>
              <span className={`text-lg font-bold ${t.total > 0 ? "text-white" : "text-dark-muted"}`}>
                {formatWon(t.total)}
              </span>
            </div>
          ))}
        </div>
      )}

      {done.length > 0 && (
        <>
          <GroupLabel dark className="px-6 pt-5 pb-2">
            게임별 결과
          </GroupLabel>
          <div className="mx-5 overflow-hidden rounded-2xl bg-dark-surface">
            {done.map((r) => (
              <Link
                key={r.game.id}
                href={`/admin/sessions/${id}/games/${r.game.id}`}
                className="flex min-h-12 items-center gap-3 border-b border-dark-separator px-4 last:border-b-0"
              >
                <span className="text-[15px] font-semibold">{r.game.game_no}게임</span>
                <span className="flex min-w-0 flex-1 flex-wrap gap-x-2 text-[13px] text-dark-muted">
                  {[...r.ranked]
                    .sort((a, b) => a.rank - b.rank)
                    .map((t) => (
                      <span key={t.teamNo} className={t.rank === 1 ? "font-semibold text-dark-link" : ""}>
                        {t.rank}등 {teamName(t.teamNo)} {t.total}
                      </span>
                    ))}
                </span>
                <Icon name="chevronRight" size={16} strokeWidth={2.4} className="text-dark-muted" />
              </Link>
            ))}
          </div>
        </>
      )}

      <GroupLabel dark className="px-6 pt-5 pb-2">
        단톡방 공유 미리보기
      </GroupLabel>
      <pre className="mx-5 rounded-xl bg-dark-surface px-4 py-3.5 font-sans text-[13px] leading-relaxed whitespace-pre-wrap text-edge">
        {text}
      </pre>

      <div className="flex justify-center pt-4">
        {closed ? (
          <ActionButton
            action={reopenSession.bind(null, id)}
            confirm="한 번 더 누르면 마감을 취소해요"
            className="min-h-11 px-4 text-sm text-dark-muted underline"
          >
            마감 취소 (점수를 다시 고쳐야 할 때)
          </ActionButton>
        ) : (
          <ActionButton
            action={closeSession.bind(null, id)}
            confirm="한 번 더 누르면 정모를 마감해요"
            className="min-h-11 px-4 text-[15px] font-semibold text-dark-link"
          >
            정모 마감하기
          </ActionButton>
        )}
      </div>

      <BottomBar dark>
        <CopyButton
          text={text}
          label={
            <>
              <Icon name="copy" size={18} strokeWidth={2} />
              카톡용 텍스트 복사
            </>
          }
          className={primaryButton}
        />
        <div className="flex min-h-6 items-center justify-center gap-1.5 text-[13px] text-dark-muted">
          {!closed ? (
            "마감하면 구글 시트 점수기록지에 자동 반영돼요"
          ) : settings.last_sync_error ? (
            <span className="text-danger">시트 반영 실패 · 설정에서 다시 내보내 주세요</span>
          ) : settings.last_synced_at ? (
            <>
              <Icon name="check" size={14} strokeWidth={2.4} className="text-dark-link" />
              구글 시트 점수기록지에 자동 반영됨 · {syncedAt(settings.last_synced_at)}
            </>
          ) : (
            "구글 시트가 아직 연결되지 않았어요"
          )}
        </div>
      </BottomBar>
    </div>
  );
}
