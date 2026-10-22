"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./Icon";

export type Tab = { href: string; label: string; icon: IconName };

/**
 * 하단 고정 탭바. 루트 탭(예: "/admin")은 정확히 일치할 때만 활성으로 본다.
 * 하단 고정 버튼(BottomBar)이 있는 화면에서는 숨고, 어두운 화면(.screen-dark)에서는 어두워진다 (globals.css).
 */
export function BottomTabs({ tabs, rootHref }: { tabs: Tab[]; rootHref: string }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="메뉴"
      className="tab-bar fixed inset-x-0 bottom-0 z-20 border-t border-black/[.08] bg-white/[.86] pt-2 pb-[max(env(safe-area-inset-bottom),12px)] backdrop-blur-xl backdrop-saturate-[1.8]"
    >
      <ul className="mx-auto flex max-w-[480px] justify-around">
        {tabs.map((tab) => {
          // "/me"가 "/members"에 걸리지 않도록 경로 단위로 비교
          const active =
            tab.href === rootHref
              ? pathname === rootHref
              : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 min-w-16 flex-col items-center gap-[3px] text-[11px] ${
                  active ? "font-semibold text-accent" : "font-medium text-muted"
                }`}
              >
                <Icon name={tab.icon} />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** 탭바에 가려지지 않도록 화면 맨 아래에 두는 여백 */
export function TabBarSpacer() {
  return <div aria-hidden className="tab-spacer h-[calc(76px+env(safe-area-inset-bottom))]" />;
}
