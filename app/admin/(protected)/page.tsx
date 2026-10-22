import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { TEAM_NAME } from "@/lib/brand";
import { db } from "@/lib/db/client";
import { listSessions } from "@/lib/db/sessions";
import { formatDate } from "@/lib/format";
import { logout } from "../actions";

const MENU = [
  { href: "/admin/sessions", icon: "📅", title: "정모 목록" },
  { href: "/admin/members", icon: "👥", title: "회원·티어" },
  { href: "/admin/settings", icon: "⚙️", title: "설정" },
  { href: "/home", icon: "👀", title: "회원 화면" },
];

export default async function AdminHomePage() {
  const [members, sessions] = await Promise.all([
    db().from("members").select("id", { count: "exact", head: true }).eq("active", true),
    listSessions(),
  ]);
  if (members.error) throw members.error;
  const open = sessions.filter((s) => !s.closed_at);
  const recentClosed = sessions.filter((s) => s.closed_at).slice(0, 3);

  return (
    <div className="pb-6">
      <PageHeader
        title={`${TEAM_NAME} 운영진`}
        back="/"
        action={
          <form action={logout}>
            <button className="text-sm text-muted underline">로그아웃</button>
          </form>
        }
      />

      <Link
        href="/admin/sessions/new"
        className="m-4 flex h-20 items-center justify-center gap-2 rounded-2xl bg-brand text-lg font-bold text-white shadow-md active:opacity-90"
      >
        <span className="text-2xl" aria-hidden>
          ＋
        </span>
        새 정모 만들기
      </Link>

      {open.length > 0 && (
        <section className="mx-4">
          <h2 className="mb-2 text-sm font-bold">진행 중인 정모</h2>
          <ul className="flex flex-col gap-2">
            {open.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/admin/sessions/${s.id}`}
                  className="flex items-center rounded-2xl border-2 border-brand bg-brand-soft p-4"
                >
                  <span>
                    <span className="block text-lg font-bold text-brand">{formatDate(s.date)}</span>
                    <span className="text-sm text-muted">
                      참석 {s.attendeeCount}명 · {s.gameCount}게임
                    </span>
                  </span>
                  <span className="ml-auto text-2xl text-brand">›</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <nav className="m-4 grid grid-cols-2 gap-2">
        {MENU.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="flex items-center gap-3 rounded-2xl border border-line p-4 shadow-sm active:bg-background"
          >
            <span className="text-2xl" aria-hidden>
              {m.icon}
            </span>
            <span className="font-bold">{m.title}</span>
          </Link>
        ))}
      </nav>

      <section className="mx-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-background p-4">
          <p className="text-xs text-muted">활동 회원</p>
          <p className="mt-1 text-2xl font-bold">{members.count ?? 0}명</p>
        </div>
        <div className="rounded-2xl bg-background p-4">
          <p className="text-xs text-muted">기록된 정모</p>
          <p className="mt-1 text-2xl font-bold">{sessions.length}회</p>
        </div>
      </section>

      {recentClosed.length > 0 && (
        <section className="mx-4 mt-6">
          <h2 className="mb-2 text-sm font-bold">최근 마감한 정모</h2>
          <ul className="overflow-hidden rounded-2xl border border-line">
            {recentClosed.map((s) => (
              <li key={s.id} className="border-b border-line last:border-b-0">
                <Link href={`/admin/sessions/${s.id}/settlement`} className="flex items-center px-4 py-3 text-sm">
                  <span className="font-bold">{formatDate(s.date)}</span>
                  <span className="ml-2 text-muted">
                    {s.attendeeCount}명 · {s.gameCount}게임
                  </span>
                  <span className="ml-auto text-muted">정산 ›</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
