"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { BottomBar, StepBar } from "@/components/Flow";
import { Icon } from "@/components/Icon";
import { NavBar } from "@/components/PageHeader";
import { teamName } from "@/components/TeamBadge";
import { primaryButton, quietButton } from "@/components/ui";
import { isCompleteScore, parseScore } from "@/lib/domain/score";
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
  gameNo,
  sessionId,
  gameId,
  teams,
  initialScores,
  readOnly,
}: {
  gameNo: number;
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

  const left = order.length - entered;

  return (
    <div>
      <NavBar
        title={`${gameNo}게임 점수`}
        back={`/admin/sessions/${sessionId}`}
        backLabel="정모"
        right={
          <span className="text-sm font-semibold text-accent" aria-live="polite">
            {entered}/{order.length}
          </span>
        }
      />
      <StepBar current="점수" />
      {readOnly && <p className="px-6 pt-3 text-[13px] text-muted">마감된 정모 · 보기 전용</p>}

      <div className="flex flex-col gap-3 px-5 pt-4">
        {teams.map((t) => {
          const scores = t.members.map((m) => parseScore(values[m.id])).map((p) => ("score" in p ? p.score : null));
          const sum = scores.reduce<number>((a, s) => a + (s ?? 0), 0);
          return (
            <section key={t.teamNo} className="overflow-hidden rounded-2xl bg-surface">
              <div className="flex items-center gap-2 px-4 pt-3 pb-1.5">
                <span className="text-[15px] font-bold">{teamName(t.teamNo)}</span>
                <span className="flex-1 text-xs text-muted">
                  팀 핸디 {t.handicap > 0 ? `+${t.handicap}` : 0}
                  {t.adjusted && " · 합의 조정"}
                </span>
                <span className="text-[13px] text-muted">
                  합계 <span className="text-[17px] font-bold text-foreground">{sum + t.handicap}</span>
                </span>
              </div>

              {t.members.map((m) => {
                const filled = values[m.id] !== "";
                return (
                  <div key={m.id} className="px-4 py-1.5">
                    <div className="flex min-h-14 items-center gap-2.5">
                      <label htmlFor={`score-${m.id}`} className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-base font-medium">{m.name}</span>
                        <span className={`text-xs ${m.handicap > 0 ? "text-accent" : "text-muted"}`}>
                          {m.handicap > 0 ? `핸디 +${m.handicap}` : "핸디 없음"}
                        </span>
                      </label>
                      <span className="w-5 text-center" aria-live="polite">
                        {status[m.id] === "saving" && <span className="text-xs text-muted">…</span>}
                        {status[m.id] === "saved" && (
                          <Icon name="check" size={16} strokeWidth={2.4} className="text-accent" label="저장됨" />
                        )}
                        {status[m.id] === "error" && <span className="text-sm font-bold text-danger">!</span>}
                      </span>
                      <input
                        id={`score-${m.id}`}
                        ref={(el) => {
                          if (el) inputs.current.set(m.id, el);
                          else inputs.current.delete(m.id);
                        }}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={3}
                        enterKeyHint="next"
                        autoComplete="off"
                        placeholder="-"
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
                        className={`h-12 w-24 rounded-xl border text-center text-2xl font-bold outline-none focus:border-2 focus:border-accent disabled:opacity-60 ${
                          status[m.id] === "error" ? "border-2 border-danger" : "border-fill"
                        } ${filled ? "bg-surface" : "bg-background"}`}
                      />
                    </div>
                    {errors[m.id] && <p className="text-right text-xs text-danger">{errors[m.id]}</p>}
                  </div>
                );
              })}
              {t.puppet !== null && (
                <div className="flex min-h-12 items-center border-t border-separator px-4 text-[15px] text-muted">
                  꼭두각시 {t.puppet}점 · 팀 핸디에 포함
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
        <Link
          href={`/admin/sessions/${sessionId}/games/${gameId}`}
          className={left === 0 ? primaryButton : quietButton}
        >
          {left === 0 ? "결과 보기" : "중간 결과 보기"}
        </Link>
      </BottomBar>
    </div>
  );
}
