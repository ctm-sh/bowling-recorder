import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "./Icon";

/** 파란 글자 "‹ 이전 화면" 링크 */
export function BackLink({ href, label = "뒤로", dark }: { href: string; label?: string; dark?: boolean }) {
  return (
    <Link
      href={href}
      className={`flex min-h-11 items-center gap-0.5 px-2 text-[17px] ${dark ? "text-dark-link" : "text-link"}`}
    >
      <Icon name="chevronLeft" size={20} strokeWidth={2.2} />
      {label}
    </Link>
  );
}

/**
 * 큰 제목 헤더 (화면 타이틀 34px, 어두운 화면 30px).
 * back이 있으면 제목 위에 뒤로 가기 줄을, eyebrow가 있으면 제목 위에 작은 회색 글씨를 둔다.
 */
export function PageHeader({
  title,
  eyebrow,
  sub,
  action,
  back,
  backLabel,
  topRight,
  dark,
}: {
  title: ReactNode;
  eyebrow?: ReactNode;
  /** 제목 아래 보조 설명 */
  sub?: ReactNode;
  /** 제목 줄 오른쪽 */
  action?: ReactNode;
  back?: string;
  backLabel?: string;
  /** 뒤로 가기 줄 오른쪽 */
  topRight?: ReactNode;
  dark?: boolean;
}) {
  return (
    <header className={back ? "pt-2" : "pt-8"}>
      {back && (
        <div className="flex items-center justify-between px-3">
          <BackLink href={back} label={backLabel} dark={dark} />
          {topRight && <div className="pr-2">{topRight}</div>}
        </div>
      )}
      <div className={`flex items-end justify-between gap-3 px-5 ${back ? "pt-1" : ""}`}>
        <div className="flex min-w-0 flex-col gap-1">
          {eyebrow && (
            <div className={`text-[13px] font-semibold ${dark ? "text-dark-muted" : "text-muted"}`}>{eyebrow}</div>
          )}
          <h1
            className={`font-bold ${
              dark ? "text-[30px] tracking-[-0.5px]" : "text-[34px] leading-[1.12] tracking-[-0.6px]"
            }`}
          >
            {title}
          </h1>
          {sub && <div className={`text-sm ${dark ? "text-dark-muted" : "text-muted"}`}>{sub}</div>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  );
}

/** 정모 진행 화면의 가운데 정렬 작은 제목 줄: [뒤로] 제목 [오른쪽] */
export function NavBar({
  title,
  back,
  backLabel,
  backText,
  right,
  dark,
}: {
  title: ReactNode;
  back?: string;
  backLabel?: string;
  dark?: boolean;
  /** 화살표 없이 글자만 ("취소" 등) */
  backText?: boolean;
  right?: ReactNode;
}) {
  return (
    <header className="grid grid-cols-[1fr_auto_1fr] items-center px-3 pt-2">
      <div>
        {back &&
          (backText ? (
            <Link
              href={back}
              className={`flex min-h-11 items-center px-2 text-[17px] ${dark ? "text-dark-link" : "text-link"}`}
            >
              {backLabel}
            </Link>
          ) : (
            <BackLink href={back} label={backLabel} dark={dark} />
          ))}
      </div>
      <span className="truncate text-[17px] font-semibold">{title}</span>
      <div className="flex justify-end pr-2">{right}</div>
    </header>
  );
}

/** 빈 목록 안내 */
export function Empty({ children, dark }: { children: ReactNode; dark?: boolean }) {
  return (
    <div className={`px-6 py-14 text-center text-[15px] ${dark ? "text-dark-muted" : "text-muted"}`}>{children}</div>
  );
}
