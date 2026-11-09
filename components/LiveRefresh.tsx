"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** 진행 중 화면을 주기적으로 새로 받아온다. 화면을 보고 있을 때만 요청한다. */
export function LiveRefresh({ seconds = 15 }: { seconds?: number }) {
  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(timer);
  }, [router, seconds]);

  return null;
}
