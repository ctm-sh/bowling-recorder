import Link from "next/link";
import { connection } from "next/server";
import { Icon } from "@/components/Icon";
import { Empty, PageHeader } from "@/components/PageHeader";
import { ListCard, Pill } from "@/components/ui";
import { listSessions } from "@/lib/db/sessions";
import { formatDateLong } from "@/lib/format";

export default async function ResultsPage() {
  await connection();
  const sessions = (await listSessions()).filter((s) => s.gameCount > 0);

  return (
    <>
      <PageHeader eyebrow={`정모 ${sessions.length}회`} title="결과" />
      {sessions.length === 0 ? (
        <Empty>아직 기록된 정모가 없어요.</Empty>
      ) : (
        <ListCard className="mx-5 mt-4">
          {sessions.map((s) => (
            <Link key={s.id} href={`/results/${s.id}`} className="flex min-h-14 items-center gap-3 px-4">
              <span className="text-base">{formatDateLong(s.date)}</span>
              {!s.closed_at && <Pill tone="accent">진행 중</Pill>}
              <span className="ml-auto text-[13px] text-muted">
                {s.attendeeCount}명 · {s.gameCount}게임
              </span>
              <Icon name="chevronRight" size={16} strokeWidth={2.4} className="text-[#c7c7cc]" />
            </Link>
          ))}
        </ListCard>
      )}
    </>
  );
}
