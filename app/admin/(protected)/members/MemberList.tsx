"use client";

import Link from "next/link";
import { useState } from "react";
import { TierBadge } from "@/components/TierBadge";
import type { MemberWithStats } from "@/lib/db/members";

export function MemberList({
  members,
  candidates,
}: {
  members: MemberWithStats[];
  /** 승급(up)·강등(down) 후보 */
  candidates: Record<string, "up" | "down">;
}) {
  const [query, setQuery] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [onlyCandidates, setOnlyCandidates] = useState(false);
  const candidateCount = Object.keys(candidates).length;

  const q = query.trim();
  const visible = members.filter(
    (m) => (showInactive || m.active) && (!q || m.name.includes(q)) && (!onlyCandidates || candidates[m.id]),
  );
  const activeCount = members.filter((m) => m.active).length;

  return (
    <>
      <div className="sticky top-14 z-10 flex flex-col gap-2 border-b border-line bg-surface p-4">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="이름 검색"
          className="h-11 rounded-xl border-2 border-line px-3 outline-none focus:border-brand"
        />
        {candidateCount > 0 && (
          <button
            type="button"
            onClick={() => setOnlyCandidates(!onlyCandidates)}
            aria-pressed={onlyCandidates}
            className={`h-10 rounded-xl text-sm font-bold ${
              onlyCandidates ? "bg-brand text-white" : "bg-brand-soft text-brand"
            }`}
          >
            ⬆⬇ 승급·강등 후보 {candidateCount}명 {onlyCandidates ? "· 전체 보기" : "만 보기"}
          </button>
        )}
        <div className="flex items-center justify-between text-sm text-muted">
          <span>
            활동 {activeCount}명 · 전체 {members.length}명
          </span>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="size-4 accent-brand"
            />
            비활성 포함
          </label>
        </div>
      </div>

      <ul>
        {visible.map((m) => (
          <li key={m.id} className="border-b border-line">
            <Link
              href={`/admin/members/${m.id}`}
              className={`flex items-center gap-3 px-4 py-3 ${m.active ? "" : "opacity-50"}`}
            >
              <TierBadge tier={m.tier} />
              <span className="font-bold">{m.name}</span>
              {!m.active && <span className="text-xs text-muted">비활성</span>}
              {candidates[m.id] === "up" && <span className="text-xs font-bold text-green-700">⬆ 승급 후보</span>}
              {candidates[m.id] === "down" && <span className="text-xs font-bold text-danger">⬇ 강등 후보</span>}
              <span className="ml-auto text-right text-sm">
                <span className="font-bold">{m.avg === null ? "—" : m.avg.toFixed(1)}</span>
                <span className="ml-1 text-xs text-muted">{m.games}게임</span>
              </span>
            </Link>
          </li>
        ))}
        {visible.length === 0 && <li className="p-8 text-center text-sm text-muted">회원이 없어요.</li>}
      </ul>
    </>
  );
}
