import Link from "next/link";
import { LoginForm } from "./LoginForm";

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-dvh flex-col justify-center px-6">
      <h1 className="text-2xl font-bold">운영진 로그인</h1>
      <p className="mt-1 text-sm text-muted">점수 입력과 팀 구성은 운영진만 할 수 있어요.</p>
      <LoginForm />
      <Link href="/" className="mt-6 text-center text-sm text-muted underline">
        회원 화면으로 돌아가기
      </Link>
    </main>
  );
}
