import { PageHeader } from "@/components/PageHeader";
import { TEAM_NAME } from "@/lib/brand";
import { LoginForm } from "./LoginForm";

export default function AdminLoginPage() {
  return (
    <main className="min-h-dvh">
      <PageHeader
        back="/"
        backLabel="처음으로"
        eyebrow={TEAM_NAME}
        title="운영진 로그인"
        sub="정모 진행, 팀 구성, 점수 입력은 운영진만 할 수 있어요."
      />
      <div className="mx-5 mt-6 rounded-[18px] bg-surface p-5">
        <LoginForm />
      </div>
    </main>
  );
}
