import Link from "next/link";
import { TEAM_NAME } from "@/lib/brand";
import { LoginForm } from "./LoginForm";

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-dvh flex-col px-6 pt-4 pb-10">
      <Link href="/" aria-label="처음으로" className="-ml-2 flex size-10 items-center justify-center text-2xl">
        ‹
      </Link>
      <div className="flex flex-1 flex-col justify-center">
        <span className="text-5xl" aria-hidden>
          🎳
        </span>
        <h1 className="mt-3 text-2xl font-bold">{TEAM_NAME} 운영진</h1>
        <p className="mt-1 text-sm text-muted">정모 진행, 팀 구성, 점수 입력은 운영진만 할 수 있어요.</p>
        <LoginForm />
      </div>
    </main>
  );
}
