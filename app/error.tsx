"use client";

import Link from "next/link";
import { START_HREF, START_LABEL } from "@/lib/brand";
import { primaryButton } from "@/components/ui";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col justify-center gap-3 px-5">
      <h1 className="text-[34px] leading-[1.12] font-bold tracking-[-0.6px]">잠시 문제가 생겼어요</h1>
      <p className="text-[15px] leading-[1.47] text-muted">
        네트워크가 불안정하거나 서버가 바쁜 것 같아요. 다시 시도해주세요.
      </p>
      <div className="mt-4 flex flex-col items-center gap-2">
        <button onClick={reset} className={primaryButton}>
          다시 시도
        </button>
        <Link href={START_HREF} className="flex min-h-11 items-center text-[15px] text-link">
          {START_LABEL}
        </Link>
      </div>
    </main>
  );
}
