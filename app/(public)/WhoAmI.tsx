"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { TierBadge } from "@/components/TierBadge";
import { setMe } from "./me-actions";

export type Pickable = { id: string; name: string; tier: number | null };

/** 처음 들어온 회원이 자기 이름을 고르는 화면 (이 기기에 기억) */
export function WhoAmI({ members }: { members: Pickable[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
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
  const visible = members.filter((m) => !q || m.name.includes(q));

  return (
    <div className="p-4">
      <div className="rounded-2xl bg-brand p-5 text-white">
        <p className="text-2xl font-bold">🎳 반가워요!</p>
        <p className="mt-1 text-sm opacity-80">
          내 이름을 고르면 이 휴대폰에서는 내 점수·승률·낼 금액을 바로 볼 수 있어요.
        </p>
      </div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="이름 검색"
        className="mt-4 h-12 w-full rounded-xl border-2 border-line px-3 outline-none focus:border-brand"
      />
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      <ul className="mt-3 grid grid-cols-2 gap-2">
        {visible.map((m) => (
          <li key={m.id}>
            <button
              onClick={() => pick(m.id)}
              disabled={pending}
              className="flex h-12 w-full items-center gap-2 rounded-xl border border-line px-3 text-left font-bold disabled:opacity-50"
            >
              <TierBadge tier={m.tier} />
              {m.name}
            </button>
          </li>
        ))}
      </ul>
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
