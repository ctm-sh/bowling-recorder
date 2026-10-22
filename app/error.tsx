"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <span className="text-5xl" aria-hidden>
        😵
      </span>
      <h1 className="text-xl font-bold">잠시 문제가 생겼어요</h1>
      <p className="text-sm text-muted">네트워크가 불안정하거나 서버가 바쁜 것 같아요. 다시 시도해주세요.</p>
      <div className="mt-2 flex gap-2">
        <button onClick={reset} className="rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white">
          다시 시도
        </button>
        <Link href="/" className="rounded-xl bg-brand-soft px-5 py-3 text-sm font-bold text-brand">
          처음으로
        </Link>
      </div>
    </main>
  );
}
