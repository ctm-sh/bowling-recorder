import Link from "next/link";
import { db } from "@/lib/db/client";
import { TEAM_NAME } from "@/lib/brand";
import { getMeId } from "@/lib/me";

// 첫 화면: 회원 / 운영진 입구
export default async function LandingPage() {
  const meId = await getMeId();
  const me = meId ? (await db().from("members").select("name").eq("id", meId).maybeSingle()).data : null;

  return (
    <main className="flex min-h-dvh flex-col bg-gradient-to-b from-brand to-[#0b0f1a] px-6 pt-16 pb-10 text-white">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <span className="text-7xl drop-shadow" aria-hidden>
          🎳
        </span>
        <h1 className="mt-4 text-5xl font-extrabold tracking-tight">{TEAM_NAME}</h1>
        <p className="mt-2 text-sm text-white/70">볼링 동호회 점수 · 팀 · 정산 기록</p>
      </div>

      <div className="flex flex-col gap-3">
        {me ? (
          <>
            <Link
              href="/home"
              className="flex h-16 items-center justify-between rounded-2xl bg-white px-5 text-brand shadow-lg"
            >
              <span>
                <span className="block text-xs text-muted">회원</span>
                <span className="text-lg font-bold">{me.name}님으로 계속</span>
              </span>
              <span className="text-2xl">›</span>
            </Link>
            <Link href="/home?pick=1" className="text-center text-sm text-white/70 underline">
              다른 이름으로 들어가기
            </Link>
          </>
        ) : (
          <Link
            href="/home"
            className="flex h-16 items-center justify-between rounded-2xl bg-white px-5 text-brand shadow-lg"
          >
            <span>
              <span className="block text-xs text-muted">회원</span>
              <span className="text-lg font-bold">내 기록 보러 가기</span>
            </span>
            <span className="text-2xl">›</span>
          </Link>
        )}
        <Link
          href="/admin"
          className="flex h-16 items-center justify-between rounded-2xl border border-white/30 px-5 text-white"
        >
          <span>
            <span className="block text-xs text-white/60">운영진</span>
            <span className="text-lg font-bold">정모 진행 · 점수 입력</span>
          </span>
          <span className="text-2xl">›</span>
        </Link>
      </div>
    </main>
  );
}
