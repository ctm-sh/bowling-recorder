"use client";

import { useState, type ReactNode } from "react";

export function CopyButton({ text, label, className }: { text: string; label: ReactNode; className?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      // http(같은 와이파이 IP 접속)에서는 clipboard API가 막힐 수 있어 textarea로 대신 복사
      const area = document.createElement("textarea");
      area.value = text;
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      setState(ok ? "copied" : "failed");
    }
    setTimeout(() => setState("idle"), 2000);
  }

  return (
    <button onClick={copy} className={className}>
      {state === "copied" ? "✓ 복사했어요" : state === "failed" ? "복사 실패 · 길게 눌러 복사" : label}
    </button>
  );
}
