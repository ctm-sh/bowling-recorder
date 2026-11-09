"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { BottomBar } from "@/components/Flow";
import { Icon } from "@/components/Icon";
import { NavBar } from "@/components/PageHeader";
import { primaryButton, quietButton } from "@/components/ui";
import { isCompleteScore, parseScore } from "@/lib/domain/score";

export type SheetGroup = {
  key: string;
  label: string;
  /** 게임마다 더하는 꼭두각시 점수 */
  fill: number | null;
  people: { id: string; name: string; handicap: number }[];
};

type Status = "saving" | "saved" | "error";

/** 3게임·마스터즈 공용 점수 입력. 입력하면 바로 저장하고 다음 사람으로 넘어간다. */
export function RankingScoreSheet({
  title,
  back,
  groups,
  initialScores,
  readOnly,
  notice,
  save,
  nextHref,
  nextLabel,
}: {
  title: string;
  back: string;
  groups: SheetGroup[];
  initialScores: Record<string, number>;
  readOnly: boolean;
  notice?: string;
  save: (entryId: string, score: number | null) => Promise<{ error?: string }>;
  nextHref: string;
  nextLabel: string;
}) {
  const order = groups.flatMap((g) => g.people.map((p) => p.id));
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(order.map((id) => [id, initialScores[id] === undefined ? "" : String(initialScores[id])])),
  );
  const [status, setStatus] = useState<Record<string, Status>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
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

    const previous = saved.current[id];
    saved.current[id] = text;
    setStatus((s) => ({ ...s, [id]: "saving" }));
    try {
      const result = await save(id, parsed.score);
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

  const scoreOf = (id: string) => {
    const parsed = parseScore(values[id]);
    return "score" in parsed ? parsed.score : null;
  };
  const entered = order.filter((id) => values[id] !== "" && scoreOf(id) !== null).length;
  const left = order.length - entered;

  return (
    <div>
      <NavBar
        title={title}
        back={back}
        backLabel="랭킹전"
        right={
          <span className="text-sm font-semibold text-accent" aria-live="polite">
            {entered}/{order.length}
          </span>
        }
      />
      {readOnly && <p className="px-6 pt-3 text-[13px] text-muted">마감된 랭킹전 · 보기 전용</p>}
      {notice && <p className="mx-5 mt-3 rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent">{notice}</p>}

      <div className="flex flex-col gap-3 px-5 pt-4">
        {groups.map((g) => {
          const sum = g.people.reduce((a, p) => {
            const score = scoreOf(p.id);
            return score === null ? a : a + score + p.handicap;
          }, 0);
          return (
            <section key={g.key} className="overflow-hidden rounded-2xl bg-surface">
              <div className="flex items-center gap-2 px-4 pt-3 pb-1.5">
                <span className="flex-1 text-[15px] font-bold">{g.label}</span>
                <span className="text-[13px] text-muted">
                  합계 <span className="text-[17px] font-bold text-foreground">{sum + (g.fill ?? 0)}</span>
                </span>
              </div>
              {g.people.map((p) => (
                <div key={p.id} className="px-4 py-1.5">
                  <div className="flex min-h-14 items-center gap-2.5">
                    <label htmlFor={`score-${p.id}`} className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-base font-medium">{p.name}</span>
                      <span className={`text-xs ${p.handicap > 0 ? "text-accent" : "text-muted"}`}>
                        {p.handicap > 0 ? `핸디 +${p.handicap}` : "핸디 없음"}
                      </span>
                    </label>
                    <span className="w-5 text-center" aria-live="polite">
                      {status[p.id] === "saving" && <span className="text-xs text-muted">…</span>}
                      {status[p.id] === "saved" && (
                        <Icon name="check" size={16} strokeWidth={2.4} className="text-accent" label="저장됨" />
                      )}
                      {status[p.id] === "error" && <span className="text-sm font-bold text-danger">!</span>}
                    </span>
                    <input
                      id={`score-${p.id}`}
                      ref={(el) => {
                        if (el) inputs.current.set(p.id, el);
                        else inputs.current.delete(p.id);
                      }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={3}
                      enterKeyHint="next"
                      autoComplete="off"
                      placeholder="-"
                      disabled={readOnly}
                      value={values[p.id]}
                      onChange={(e) => onChange(p.id, e.target.value)}
                      onBlur={(e) => void commit(p.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          focusNext(p.id);
                        }
                      }}
                      className={`h-12 w-24 rounded-xl border text-center text-2xl font-bold outline-none focus:border-2 focus:border-accent disabled:opacity-60 ${
                        status[p.id] === "error" ? "border-2 border-danger" : "border-fill"
                      } ${values[p.id] !== "" ? "bg-surface" : "bg-background"}`}
                    />
                  </div>
                  {errors[p.id] && <p className="text-right text-xs text-danger">{errors[p.id]}</p>}
                </div>
              ))}
              {g.fill !== null && (
                <div className="flex min-h-12 items-center border-t border-separator px-4 text-[15px] text-muted">
                  꼭두각시 {g.fill}점
                </div>
              )}
            </section>
          );
        })}
      </div>

      <BottomBar>
        {!readOnly && (
          <span className="text-center text-[13px] text-muted">
            {left > 0 ? `입력하면 다음 사람으로 넘어가요 · ${left}명 남음` : "모두 입력했어요"}
          </span>
        )}
        <Link href={left === 0 ? nextHref : back} className={left === 0 ? primaryButton : quietButton}>
          {left === 0 ? nextLabel : "랭킹전으로 돌아가기"}
        </Link>
      </BottomBar>
    </div>
  );
}
