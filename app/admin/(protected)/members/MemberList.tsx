"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { tierLabel } from "@/components/TierBadge";
import { chip, GroupLabel } from "@/components/ui";
import type { MemberWithStats } from "@/lib/db/members";
import { CandidateBadge } from "./CandidateBadge";

type Filter = "all" | "candidates" | "inactive";

export function MemberList({
  members,
  candidates,
  recentN,
}: {
  members: MemberWithStats[];
  /** 승급(up)·강등(down) 후보 */
  candidates: Record<string, "up" | "down">;
  recentN: number;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const candidateCount = Object.keys(candidates).length;
  const inactiveCount = members.filter((m) => !m.active).length;

  const q = query.trim();
  const matches = members.filter((m) => !q || m.name.includes(q));
  const candidateRows = matches.filter((m) => candidates[m.id]);
  const listed =
    filter === "inactive" ? matches.filter((m) => !m.active) : filter === "all" ? matches.filter((m) => m.active) : [];

  // 티어별로 묶는다 (미정은 맨 아래)
  const groups = new Map<number | null, MemberWithStats[]>();
  for (const m of [...listed].sort((a, b) => (a.tier ?? 99) - (b.tier ?? 99) || (b.avg ?? 0) - (a.avg ?? 0))) {
    groups.set(m.tier, [...(groups.get(m.tier) ?? []), m]);
  }

  return (
    <>
      <div className="mx-5 mt-3.5">
        <label htmlFor="mem-search" className="sr-only">
          회원 검색
        </label>
        <div className="flex h-10 items-center gap-2 rounded-[10px] bg-fill px-3">
          <Icon name="search" size={16} strokeWidth={2} className="text-muted" />
          <input
            id="mem-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="이름 검색"
            className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted"
          />
        </div>
      </div>

      <div className="scrollbar-none mx-5 mt-3 flex gap-2 overflow-x-auto">
        {(
          [
            ["all", "전체"],
            ["candidates", `심사 후보 ${candidateCount}`],
            ["inactive", `휴면 ${inactiveCount}`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            aria-pressed={filter === key}
            className={chip(filter === key, "sm")}
          >
            {label}
          </button>
        ))}
      </div>

      {filter !== "inactive" && candidateRows.length > 0 && (
        <>
          <GroupLabel className="px-6 pt-5 pb-2">심사 후보 · 최근 {recentN}게임 폼 기준</GroupLabel>
          <div className="mx-5 overflow-hidden rounded-2xl bg-surface">
            {candidateRows.map((m) => {
              const form = m.avg !== null && m.recentAvg !== null ? m.recentAvg - m.avg : null;
              const kind = candidates[m.id];
              return (
                <Link
                  key={m.id}
                  href={`/admin/members/${m.id}`}
                  className="flex min-h-16 items-center gap-3 border-b border-separator px-4 py-2 last:border-b-0"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-base font-semibold">{m.name}</span>
                      <CandidateBadge kind={kind} />
                    </span>
                    <span className="truncate text-xs text-muted">
                      {tierLabel(m.tier)} · 전체 {m.avg?.toFixed(1) ?? "—"} → 최근 {m.recentAvg?.toFixed(1) ?? "—"}
                    </span>
                  </div>
                  {form !== null && (
                    <span className={`text-[17px] font-bold ${kind === "up" ? "text-accent" : ""}`}>
                      {Math.abs(form) < 0.05 ? "0.0" : `${form > 0 ? "+" : "−"}${Math.abs(form).toFixed(1)}`}
                    </span>
                  )}
                  <Icon name="chevronRight" size={14} strokeWidth={2.4} className="text-[#c7c7cc]" />
                </Link>
              );
            })}
          </div>
        </>
      )}

      {[...groups].map(([tier, list]) => (
        <section key={String(tier)}>
          <GroupLabel className="px-6 pt-5 pb-2">
            {tierLabel(tier)} · {list.length}명
          </GroupLabel>
          <div className="mx-5 overflow-hidden rounded-2xl bg-surface">
            {list.map((m) => (
              <Link
                key={m.id}
                href={`/admin/members/${m.id}`}
                className="flex min-h-[52px] items-center gap-3 border-b border-separator px-4 last:border-b-0"
              >
                <span className={`flex-1 truncate text-base ${m.active ? "" : "text-muted"}`}>{m.name}</span>
                <span className="text-[13px] text-muted">
                  에버 {m.avg === null ? "—" : m.avg.toFixed(1)} · {m.games}게임
                </span>
              </Link>
            ))}
          </div>
        </section>
      ))}

      {groups.size === 0 && (filter !== "candidates" || candidateRows.length === 0) && (
        <p className="px-6 py-14 text-center text-[15px] text-muted">
          {filter === "candidates" ? "지금은 심사 후보가 없어요." : "회원이 없어요."}
        </p>
      )}
    </>
  );
}
