"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { BottomBar } from "@/components/Flow";
import { Icon } from "@/components/Icon";
import { BackLink } from "@/components/PageHeader";
import { tierLabel } from "@/components/TierBadge";
import { primaryButton } from "@/components/ui";
import { TEAM_NAME } from "@/lib/brand";
import { setMe } from "./me-actions";

export type Pickable = { id: string; name: string; tier: number | null };

const INITIALS = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";

/** "김민우" → "ㄱㅁㅇ" (초성 검색용) */
function initials(name: string) {
  return [...name]
    .map((ch) => {
      const code = ch.charCodeAt(0) - 0xac00;
      return code >= 0 && code < 11172 ? INITIALS[Math.floor(code / 588)] : ch;
    })
    .join("");
}

/** 받침이 있으면 "으로", 없거나 ㄹ받침이면 "로" */
function withRo(name: string) {
  const code = name.charCodeAt(name.length - 1) - 0xac00;
  const final = code >= 0 && code < 11172 ? code % 28 : 0;
  return `${name}${final === 0 || final === 8 ? "로" : "으로"}`;
}

/**
 * 처음 들어온 회원이 자기 이름을 고르는 화면 (이 기기에 기억).
 * 검색창을 누르면 명단이 펼쳐지고, 이름을 고른 뒤 아래 버튼으로 시작한다.
 */
export function WhoAmI({
  members,
  currentId,
  back,
  backLabel,
}: {
  members: Pickable[];
  /** 이미 고른 이름 (다른 떼굴러로 바꾸러 왔을 때) */
  currentId?: string;
  back?: string;
  backLabel?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(currentId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function start() {
    if (!selected) return;
    startTransition(async () => {
      const result = await setMe(selected);
      if (result.error) setError(result.error);
      // ?pick=1 을 떼고 같은 화면을 내 기록으로 다시 그린다
      else router.replace(pathname);
    });
  }

  const q = query.trim();
  const visible = members.filter((m) => !q || m.name.includes(q) || initials(m.name).includes(q));
  const chosen = members.find((m) => m.id === selected);

  return (
    <div>
      {back && (
        <div className="px-3 pt-2">
          <BackLink href={back} label={backLabel} />
        </div>
      )}
      <div className={`flex flex-col gap-2 px-5 ${back ? "pt-2" : "pt-8"}`}>
        <div className="text-[13px] font-semibold text-muted">{TEAM_NAME} 정모</div>
        <h1 className="text-[34px] leading-[1.12] font-bold tracking-[-0.6px]">누구신가요?</h1>
        <p className="text-[15px] leading-[1.47] text-muted">
          한 번만 고르면 이 기기에 기억돼요. 내 점수와 낼 금액을 바로 보여드려요.
        </p>
      </div>

      <div className="px-5 pt-6">
        <label htmlFor="who-search" className="sr-only">
          이름 검색
        </label>
        <div
          className={`flex h-11 items-center gap-2 rounded-[11px] bg-fill px-3.5 ${open ? "ring-2 ring-accent" : ""}`}
        >
          <Icon name="search" size={16} strokeWidth={2} className="text-muted" />
          <input
            id="who-search"
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => {
              setOpen(true);
              // 키보드가 올라와도 목록이 보이도록 검색창을 위로 올린다
              setTimeout(() => inputRef.current?.scrollIntoView({ block: "start", behavior: "smooth" }), 300);
            }}
            onBlur={() => setOpen(false)}
            placeholder="이름 검색 (초성도 돼요)"
            role="combobox"
            aria-expanded={open}
            aria-controls="who-am-i-list"
            className="min-w-0 flex-1 bg-transparent text-[17px] text-foreground outline-none placeholder:text-muted"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2 px-5 pt-6">
        {open ? (
          // 목록을 누르는 동안 검색창 포커스가 빠져 목록이 닫히지 않게 한다
          <ul
            id="who-am-i-list"
            role="listbox"
            aria-label="회원 명단"
            onPointerDown={(e) => e.preventDefault()}
            className="max-h-[50dvh] overflow-y-auto overscroll-contain rounded-xl bg-surface"
          >
            {visible.map((m) => {
              const on = m.id === selected;
              return (
                <li key={m.id} role="option" aria-selected={on} className="border-b border-separator last:border-b-0">
                  <button
                    type="button"
                    onClick={() => setSelected(m.id)}
                    className="flex min-h-14 w-full items-center gap-3 px-4 text-left"
                  >
                    <span className={`flex-1 text-[17px] ${on ? "font-semibold text-accent" : "text-foreground"}`}>
                      {m.name}
                    </span>
                    <span className="text-[13px] text-muted">{tierLabel(m.tier)}</span>
                    {on && <Icon name="check" size={20} strokeWidth={2.4} className="text-accent" />}
                  </button>
                </li>
              );
            })}
            {visible.length === 0 && <li className="px-4 py-5 text-[15px] text-muted">“{q}” 이름을 찾을 수 없어요.</li>}
          </ul>
        ) : (
          chosen && (
            <div className="flex min-h-14 items-center gap-3 rounded-xl bg-surface px-4">
              <span className="flex-1 text-[17px] font-semibold text-accent">{chosen.name}</span>
              <span className="text-[13px] text-muted">{tierLabel(chosen.tier)}</span>
              <Icon name="check" size={20} strokeWidth={2.4} className="text-accent" />
            </div>
          )
        )}
        <div className="px-1 text-[13px] text-muted">
          {open
            ? `전체 ${members.length}명 중 ${visible.length}명 표시`
            : `전체 ${members.length}명 · 검색창을 눌러 찾아보세요`}
        </div>
        {error && <p className="px-1 text-sm text-danger">{error}</p>}
      </div>

      <BottomBar>
        <button type="button" onClick={start} disabled={!chosen || pending} className={primaryButton}>
          {pending ? "잠시만요…" : chosen ? `${withRo(chosen.name)} 시작하기` : "이름을 골라주세요"}
        </button>
        <Link href="/admin/login" className="flex min-h-6 justify-center text-sm text-link">
          운영진 로그인
        </Link>
      </BottomBar>
    </div>
  );
}
