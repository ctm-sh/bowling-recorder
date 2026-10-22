import Link from "next/link";
import { connection } from "next/server";
import { PageHeader } from "@/components/PageHeader";
import { listSessions } from "@/lib/db/sessions";
import { formatDate } from "@/lib/format";

export default async function ResultsPage() {
  await connection();
  const sessions = (await listSessions()).filter((s) => s.gameCount > 0);

  return (
    <>
      <PageHeader title="결과" back="/home" />
      <ul>
        {sessions.map((s) => (
          <li key={s.id} className="border-b border-line">
            <Link href={`/results/${s.id}`} className="flex items-center gap-3 px-4 py-4">
              <span className="text-base font-bold">{formatDate(s.date)}</span>
              {!s.closed_at && (
                <span className="rounded-md bg-brand-soft px-2 py-0.5 text-xs font-bold text-brand">진행 중</span>
              )}
              <span className="ml-auto text-sm text-muted">
                {s.attendeeCount}명 · {s.gameCount}게임 ›
              </span>
            </Link>
          </li>
        ))}
        {sessions.length === 0 && <li className="p-8 text-center text-sm text-muted">아직 기록된 정모가 없어요.</li>}
      </ul>
    </>
  );
}
