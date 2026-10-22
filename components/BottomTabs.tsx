"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type Tab = { href: string; label: string; icon: string };

// 하단 고정 탭. 루트 탭(예: "/", "/admin")은 정확히 일치할 때만 활성으로 본다.
export function BottomTabs({ tabs, rootHref }: { tabs: Tab[]; rootHref: string }) {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-[480px]">
        {tabs.map((tab) => {
          const active =
            tab.href === rootHref ? pathname === rootHref : pathname.startsWith(tab.href);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-16 flex-col items-center justify-center gap-0.5 text-xs ${
                  active ? "font-bold text-brand" : "text-muted"
                }`}
              >
                <span className="text-xl leading-none" aria-hidden>
                  {tab.icon}
                </span>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
