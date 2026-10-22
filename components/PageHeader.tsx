import Link from "next/link";
import type { ReactNode } from "react";

/** 상단 고정 헤더. back이 있으면 왼쪽에 뒤로 가기 버튼을 둔다. */
export function PageHeader({ title, action, back }: { title: string; action?: ReactNode; back?: string }) {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-1 border-b border-line bg-surface/95 px-2 backdrop-blur">
      {back ? (
        <Link
          href={back}
          aria-label="뒤로 가기"
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-2xl text-foreground active:bg-background"
        >
          ‹
        </Link>
      ) : (
        <span className="w-2" />
      )}
      <h1 className="min-w-0 flex-1 truncate text-lg font-bold">{title}</h1>
      {action && <div className="shrink-0 pr-2">{action}</div>}
    </header>
  );
}

// 아직 구현하지 않은 화면 자리 표시
export function ComingSoon({ milestone, children }: { milestone: string; children: ReactNode }) {
  return (
    <div className="m-4 rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">
      {children}
      <p className="mt-1 text-xs">({milestone}에서 구현)</p>
    </div>
  );
}

/** 빈 목록 안내 */
export function Empty({ icon = "🎳", children }: { icon?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center text-sm text-muted">
      <span className="text-4xl" aria-hidden>
        {icon}
      </span>
      {children}
    </div>
  );
}
