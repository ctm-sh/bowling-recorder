import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { formatDate, formatWon } from "@/lib/format";
import { listSessions } from "@/lib/db/sessions";

export default async function AdminSessionsPage() {
  const sessions = await listSessions();

  return (
    <>
      <PageHeader
        title="정모"
        action={
          <Link href="/admin/sessions/new" className="rounded-lg bg-brand px-3 py-1.5 text-sm font-bold text-white">
            + 새 정모
          </Link>
        }
      />
      <ul>
        {sessions.map((s) => (
          <li key={s.id} className="border-b border-line">
            <Link href={`/admin/sessions/${s.id}`} className="flex items-center gap-3 px-4 py-4">
              <span className="text-base font-bold">{formatDate(s.date)}</span>
              {s.closed_at ? (
                <span className="rounded-md bg-background px-2 py-0.5 text-xs text-muted">마감</span>
              ) : (
                <span className="rounded-md bg-brand-soft px-2 py-0.5 text-xs font-bold text-brand">진행 중</span>
              )}
              <span className="ml-auto text-right text-sm text-muted">
                {s.attendeeCount}명 · {s.gameCount}게임 · {formatWon(s.fee_per_game)}
              </span>
            </Link>
          </li>
        ))}
        {sessions.length === 0 && (
          <li className="p-8 text-center text-sm text-muted">아직 정모가 없어요. 오른쪽 위에서 새 정모를 만들어요.</li>
        )}
      </ul>
    </>
  );
}
