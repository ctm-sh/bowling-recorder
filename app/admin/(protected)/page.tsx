import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { db } from "@/lib/db/client";
import { listSessions } from "@/lib/db/sessions";
import { formatDate } from "@/lib/format";
import { logout } from "../actions";

async function getStatus() {
  const [members, sessions] = await Promise.all([
    db().from("members").select("id", { count: "exact", head: true }).eq("active", true),
    listSessions(),
  ]);
  if (members.error) throw members.error;
  return {
    activeMembers: members.count ?? 0,
    openSession: sessions.find((s) => !s.closed_at) ?? null,
    sessionCount: sessions.length,
  };
}

export default async function AdminHomePage() {
  const { activeMembers, openSession, sessionCount } = await getStatus();

  return (
    <>
      <PageHeader
        title="운영진 홈"
        action={
          <form action={logout}>
            <button className="text-sm text-muted underline">로그아웃</button>
          </form>
        }
      />

      {openSession ? (
        <Link
          href={`/admin/sessions/${openSession.id}`}
          className="m-4 block rounded-2xl bg-brand p-5 text-white"
        >
          <p className="text-xs opacity-80">진행 중인 정모</p>
          <p className="mt-1 text-2xl font-bold">{formatDate(openSession.date)}</p>
          <p className="mt-1 text-sm opacity-80">
            참석 {openSession.attendeeCount}명 · {openSession.gameCount}게임 →
          </p>
        </Link>
      ) : (
        <Link
          href="/admin/sessions/new"
          className="m-4 flex h-24 items-center justify-center rounded-2xl bg-brand text-lg font-bold text-white"
        >
          + 오늘 정모 시작
        </Link>
      )}

      <section className="mx-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-line p-4">
          <p className="text-xs text-muted">활동 회원</p>
          <p className="mt-1 text-2xl font-bold">{activeMembers}명</p>
        </div>
        <div className="rounded-2xl border border-line p-4">
          <p className="text-xs text-muted">지난 정모</p>
          <p className="mt-1 text-2xl font-bold">{sessionCount}회</p>
        </div>
      </section>

      <Link
        href="/"
        className="m-4 block rounded-xl bg-brand-soft py-3 text-center text-sm font-bold text-brand"
      >
        회원 화면 보기
      </Link>
    </>
  );
}
