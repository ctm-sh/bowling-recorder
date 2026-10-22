import type { ReactNode } from "react";

export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-line bg-surface px-4">
      <h1 className="text-lg font-bold">{title}</h1>
      {action}
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
