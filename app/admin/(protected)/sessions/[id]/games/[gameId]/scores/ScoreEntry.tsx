"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { TierBadge } from "@/components/TierBadge";
import { isCompleteScore, parseScore } from "@/lib/domain/score";
import { teamColor } from "@/lib/teamColors";
import { saveScore } from "./actions";

export type EntryTeam = {
  teamNo: number;
  /** 받는 순 핸디 (꼭두각시 포함) */
  handicap: number;
  adjusted: boolean;
  /** 꼭두각시 점수. 없으면 null */
  puppet: number | null;
  members: { id: string; name: string; tier: number; handicap: number }[];
};

type Status = "saving" | "saved" | "error";

export function ScoreEntry({
  sessionId,
  gameId,
  teams,
  initialScores,
  readOnly,
}: {
  sessionId: string;
  gameId: string;
  teams: EntryTeam[];
  initialScores: Record<string, number>;
  readOnly: boolean;
}) {
  const order = teams.flatMap((t) => t.members.map((m) => m.id));
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(order.map((id) => [id, initialScores[id] === undefined ? "" : String(initialScores[id])])),
  );
  const [status, setStatus] = useState<Record<string, Status>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  // 서버에 저장된 값 (같은 값이면 다시 저장하지 않는다)
  const saved = useRef<Record<string, string>>({ ...values });
  const inputs = useRef(new Map<string, HTMLInputElement>());

  function focusNext(id: string) {
    const next = order[order.indexOf(id) + 1];
    if (next) inputs.current.get(next)?.focus();
    else inputs.current.get(id)?.blur();
  }

  async function commit(id: string, value: string) {
    const parsed = parseScore(value);
    if ("error" in parsed) {
      setErrors((e) => ({ ...e, [id]: parsed.error }));
      setStatus((s) => ({ ...s, [id]: "error" }));
      return;
    }
    setErrors((e) => ({ ...e, [id]: "" }));
    const text = value.trim();
    if (saved.current[id] === text) return;

    // 자동 이동 직후 blur로 같은 값이 한 번 더 저장되지 않게 먼저 기록해 둔다
    const previous = saved.current[id];
    saved.current[id] = text;
    setStatus((s) => ({ ...s, [id]: "saving" }));
    try {
      const result = await saveScore(sessionId, gameId, id, parsed.score);
      if (result.error) throw new Error(result.error);
      setStatus((s) => ({ ...s, [id]: "saved" }));
    } catch (e) {
      saved.current[id] = previous;
      setErrors((err) => ({ ...err, [id]: e instanceof Error ? e.message : "저장하지 못했어요." }));
      setStatus((s) => ({ ...s, [id]: "error" }));
    }
  }

  function onChange(id: string, raw: string) {
    const value = raw.replace(/\D/g, "").slice(0, 3);
    setValues((v) => ({ ...v, [id]: value }));
    if (isCompleteScore(value)) {
      void commit(id, value);
      focusNext(id);
    }
  }

  const entered = order.filter((id) => values[id] !== "" && !("error" in parseScore(values[id]))).length;

  return (
    <div className="pb-40">
      <div className="sticky top-14 z-10 border-b border-line bg-surface px-4 py-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-bold">
            {entered}/{order.length} 입력
          </span>
          {readOnly && <span className="text-xs text-muted">마감된 정모 · 보기 전용</span>}
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-background">
          <div className="h-full bg-brand transition-all" style={{ width: `${(entered / order.length) * 100}%` }} />
        </div>
      </div>

      <section className="flex flex-col gap-3 px-4 pt-4">
        {teams.map((t) => {
          const scores = t.members.map((m) => parseScore(values[m.id])).map((p) => ("score" in p ? p.score : null));
          const sum = scores.reduce<number>((a, s) => a + (s ?? 0), 0);
          const missing = scores.filter((s) => s === null).length;
          return (
            <div key={t.teamNo} className="overflow-hidden rounded-2xl border border-line">
              <div className="flex items-center gap-2 bg-background px-4 py-2.5">
                <span className="size-3 rounded-full" style={{ background: teamColor(t.teamNo) }} aria-hidden />
                <span className="font-bold">{t.teamNo}팀</span>
                {t.handicap > 0 && (
                  <span className="text-xs font-bold text-brand">
                    핸디 +{t.handicap}
                    {t.adjusted && "*"}
                  </span>
                )}
              </div>

              <ul>
                {t.members.map((m) => (
                  <li key={m.id} className="border-t border-line px-4 py-2">
                    <label className="flex items-center gap-2">
                      <TierBadge tier={m.tier} />
                      <span className="min-w-0 truncate font-bold">{m.name}</span>
                      {m.handicap > 0 && (
                        <span className="rounded bg-brand-soft px-1.5 text-xs font-bold text-brand">+{m.handicap}</span>
                      )}
                      <span className="ml-auto w-4 text-center text-xs" aria-live="polite">
                        {status[m.id] === "saving" && <span className="text-muted">…</span>}
                        {status[m.id] === "saved" && <span className="text-green-600">✓</span>}
                        {status[m.id] === "error" && <span className="text-danger">!</span>}
                      </span>
                      <input
                        ref={(el) => {
                          if (el) inputs.current.set(m.id, el);
                          else inputs.current.delete(m.id);
                        }}
                        aria-label={`${m.name} 점수`}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        enterKeyHint="next"
                        autoComplete="off"
                        placeholder="—"
                        disabled={readOnly}
                        value={values[m.id]}
                        onChange={(e) => onChange(m.id, e.target.value)}
                        onBlur={(e) => void commit(m.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            focusNext(m.id);
                          }
                        }}
                        className={`h-12 w-20 rounded-xl border-2 text-center text-2xl font-bold outline-none focus:border-brand disabled:bg-background ${
                          status[m.id] === "error" ? "border-danger" : "border-line"
                        }`}
                      />
                    </label>
                    {errors[m.id] && <p className="mt-1 text-right text-xs text-danger">{errors[m.id]}</p>}
                  </li>
                ))}
                {t.puppet !== null && (
                  <li className="flex items-center gap-2 border-t border-dashed border-line px-4 py-2.5 text-sm text-muted">
                    <span aria-hidden>🎎</span>
                    꼭두각시 {t.puppet}점 (핸디에 포함)
                  </li>
                )}
              </ul>

              <div className="border-t border-line px-4 py-2.5 text-right">
                <span className="text-sm text-muted">
                  {sum}
                  {t.handicap > 0 && ` + ${t.handicap}`} ={" "}
                </span>
                <span className="text-xl font-bold text-brand">{sum + t.handicap}</span>
                {missing > 0 && <span className="ml-2 text-xs text-muted">({missing}명 미입력)</span>}
              </div>
            </div>
          );
        })}
      </section>

      <div className="fixed inset-x-0 bottom-16 z-20 mx-auto max-w-[480px] border-t border-line bg-surface p-3">
        <Link
          href={`/admin/sessions/${sessionId}/games/${gameId}`}
          className={`flex h-14 items-center justify-center rounded-xl text-base font-bold ${
            entered === order.length ? "bg-brand text-white" : "bg-brand-soft text-brand"
          }`}
        >
          {entered === order.length ? "결과 보기 →" : "중간 결과 보기"}
        </Link>
      </div>
    </div>
  );
}
