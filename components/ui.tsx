import Link from "next/link";
import type { ReactNode } from "react";

// 공통 모양 (DESIGN_GUIDE.md 3장). 상태가 없는 표시용 조각만 둔다.

/** 주요 버튼: 높이 52px 캡슐, 파란 배경 */
const capsule =
  "flex h-[52px] w-full items-center justify-center gap-1.5 rounded-full px-5 text-[17px] font-semibold active:opacity-90 disabled:opacity-40";

export const primaryButton = `${capsule} bg-accent text-white`;

/** 어두운 화면의 두 번째 주요 버튼 (흰 캡슐) */
export const whiteButton = `${capsule} bg-white text-black`;

/** 회색 캡슐 (주요 버튼 자리에 덜 강조할 때) */
export const quietButton = `${capsule} bg-fill text-foreground`;

/** 보조 버튼: 높이 48px, 회색 바탕 */
export const secondaryButton =
  "flex h-12 items-center justify-center gap-1.5 rounded-xl bg-fill px-4 text-[15px] font-semibold text-foreground active:opacity-80 disabled:bg-separator disabled:font-normal disabled:text-[#86868b]";

/** 어두운 화면의 보조 버튼 */
export const darkSecondaryButton =
  "flex h-12 items-center justify-center gap-1.5 rounded-xl bg-dark-surface px-4 text-[15px] font-semibold text-white active:opacity-80 disabled:opacity-40";

/** 입력칸 */
export const textInput =
  "h-12 w-full rounded-xl border border-edge bg-surface px-3.5 text-[17px] text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent";

/** 칩(형태 선택 40px, 필터 36px): 캡슐, 선택 시 검정 채움 */
export function chip(selected: boolean, size: "md" | "sm" = "md") {
  return `inline-flex shrink-0 items-center gap-1 rounded-full ${size === "md" ? "h-10 px-4 text-[15px]" : "h-9 px-3.5 text-sm"} ${
    selected ? "bg-foreground font-semibold text-white" : "border border-edge bg-surface text-foreground"
  }`;
}

/** 흰 카드 */
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-surface ${className}`}>{children}</div>;
}

/** 그룹 리스트 카드: 흰 카드 안 행들 사이에 1px 선 */
export function ListCard({
  children,
  className = "",
  dark,
}: {
  children: ReactNode;
  className?: string;
  dark?: boolean;
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl ${
        dark ? "bg-dark-surface [&>*]:border-dark-separator" : "bg-surface [&>*]:border-separator"
      } [&>*]:border-b [&>*:last-child]:border-b-0 ${className}`}
    >
      {children}
    </div>
  );
}

/** 그룹 라벨 (13px / 600 회색) */
export function GroupLabel({
  children,
  className = "",
  dark,
}: {
  children: ReactNode;
  className?: string;
  dark?: boolean;
}) {
  return (
    <div className={`px-1 text-[13px] font-semibold ${dark ? "text-dark-muted" : "text-muted"} ${className}`}>
      {children}
    </div>
  );
}

/** 섹션 제목 (20px) + 오른쪽 작은 설명 */
export function SectionTitle({
  children,
  note,
  dark,
  className = "",
}: {
  children: ReactNode;
  note?: ReactNode;
  dark?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex items-baseline justify-between gap-3 px-5 pt-6 pb-2 ${className}`}>
      <h2 className="text-xl font-bold">{children}</h2>
      {note && <span className={`text-right text-xs ${dark ? "text-dark-muted" : "text-muted"}`}>{note}</span>}
    </div>
  );
}

export type SegmentOption = { key: string; label: ReactNode; href?: string };

/**
 * 세그먼트 컨트롤: 회색 바탕 + 선택 칸 흰색. href가 있으면 링크, 없으면 onSelect 버튼.
 * (onSelect는 클라이언트 컴포넌트 안에서만 넘길 수 있다)
 */
export function Segmented({
  options,
  value,
  onSelect,
  label,
  dark,
  className = "",
}: {
  options: SegmentOption[];
  value: string;
  onSelect?: (key: string) => void;
  label: string;
  dark?: boolean;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={`grid gap-0.5 rounded-[10px] p-[3px] ${dark ? "bg-dark-surface" : "bg-fill"} ${className}`}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o) => {
        const selected = o.key === value;
        const cls = `flex h-[34px] items-center justify-center truncate rounded-lg px-1 text-sm ${
          selected
            ? dark
              ? "bg-[#3a3a3c] font-semibold text-white"
              : "bg-surface font-semibold text-foreground shadow-[0_1px_3px_rgba(0,0,0,.12)]"
            : dark
              ? "text-dark-muted"
              : "text-muted"
        }`;
        return o.href ? (
          <Link key={o.key} href={o.href} role="tab" aria-selected={selected} replace scroll={false} className={cls}>
            {o.label}
          </Link>
        ) : (
          <button
            key={o.key}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onSelect?.(o.key)}
            className={cls}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** 작은 캡슐 표시 (운영진, 마감 등) */
export function Pill({ children, tone = "dark" }: { children: ReactNode; tone?: "dark" | "light" | "accent" }) {
  const cls =
    tone === "dark"
      ? "bg-foreground text-white"
      : tone === "light"
        ? "bg-white text-black"
        : "bg-accent-soft text-accent";
  return <span className={`inline-flex rounded-full px-2 py-[3px] text-xs font-semibold ${cls}`}>{children}</span>;
}
