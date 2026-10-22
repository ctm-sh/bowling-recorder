"use client";

import { usePathname, useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { TierBadge } from "@/components/TierBadge";
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

/** 처음 들어온 회원이 자기 이름을 고르는 화면 (이 기기에 기억) */
export function WhoAmI({ members }: { members: Pickable[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function pick(id: string) {
    startTransition(async () => {
      const result = await setMe(id);
      if (result.error) setError(result.error);
      // ?pick=1 을 떼고 같은 화면을 내 기록으로 다시 그린다
      else router.replace(pathname);
    });
  }

  const q = query.trim();
  const visible = members.filter((m) => !q || m.name.includes(q) || initials(m.name).includes(q));

  return (
    <div className="p-4">
      <div className="rounded-2xl bg-brand p-5 text-white">
        <p className="text-2xl font-bold">🎳 반가워요!</p>
        <p className="mt-1 text-sm opacity-80">
          내 이름을 고르면 이 휴대폰에서는 내 점수·승률·낼 금액을 바로 볼 수 있어요.
        </p>
      </div>
      <div className="relative mt-4">
        <input
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
          placeholder="🔍 내 이름 검색 (초성도 돼요)"
          role="combobox"
          aria-expanded={open}
          aria-controls="who-am-i-list"
          className={`h-12 w-full border-2 px-3 outline-none ${
            open ? "rounded-t-xl border-brand" : "rounded-xl border-line"
          }`}
        />
        {open && (
          // 목록을 누르는 동안 검색창 포커스가 빠져 목록이 닫히지 않게 한다
          <ul
            id="who-am-i-list"
            role="listbox"
            onPointerDown={(e) => e.preventDefault()}
            className="max-h-[50dvh] overflow-y-auto overscroll-contain rounded-b-xl border-2 border-t-0 border-brand bg-surface"
          >
            {visible.map((m) => (
              <li key={m.id} role="option" aria-selected={false} className="border-t border-line first:border-t-0">
                <button
                  onClick={() => pick(m.id)}
                  disabled={pending}
                  className="flex h-12 w-full items-center gap-2 px-3 text-left font-bold active:bg-background disabled:opacity-50"
                >
                  <TierBadge tier={m.tier} />
                  {m.name}
                </button>
              </li>
            ))}
            {visible.length === 0 && <li className="px-3 py-4 text-sm text-muted">“{q}” 이름을 찾을 수 없어요.</li>}
          </ul>
        )}
      </div>
      {pending && <p className="mt-2 text-sm text-muted">잠시만요…</p>}
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}

export function ChangeMe({ label = "내가 아니에요" }: { label?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      onClick={() =>
        startTransition(async () => {
          await setMe(null);
          router.refresh();
        })
      }
      disabled={pending}
      className="text-sm text-muted underline"
    >
      {label}
    </button>
  );
}
