import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Empty, PageHeader } from "@/components/PageHeader";
import { ListCard, Pill } from "@/components/ui";
import { listSessions } from "@/lib/db/sessions";
import { formatDateLong, formatWon } from "@/lib/format";

export default async function AdminSessionsPage() {
  const sessions = await listSessions();

  return (
    <>
      <PageHeader
        eyebrow={`정모 ${sessions.length}회`}
        title="정모"
        action={
          <Link
            href="/admin/sessions/new"
            className="flex min-h-11 items-center gap-1 rounded-full bg-accent px-4 text-[15px] font-semibold text-white"
          >
            <Icon name="plus" size={18} strokeWidth={2} />새 정모
          </Link>
        }
      />
      {sessions.length === 0 ? (
        <Empty>아직 정모가 없어요. 오른쪽 위에서 새 정모를 만들어요.</Empty>
      ) : (
        <ListCard className="mx-5 mt-4">
          {sessions.map((s) => (
            <Link key={s.id} href={`/admin/sessions/${s.id}`} className="flex min-h-14 items-center gap-3 px-4 py-2">
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-center gap-2 text-base">
                  {formatDateLong(s.date)}
                  {!s.closed_at && <Pill tone="accent">진행 중</Pill>}
                </span>
                <span className="text-[13px] text-muted">
                  {s.attendeeCount}명 · {s.gameCount}게임 · {formatWon(s.fee_per_game)}
                </span>
              </span>
              <Icon name="chevronRight" size={16} strokeWidth={2.4} className="text-[#c7c7cc]" />
            </Link>
          ))}
        </ListCard>
      )}
    </>
  );
}
