"use client";

import { useState, useTransition } from "react";
import { BottomBar, Steps } from "@/components/Flow";
import { Icon } from "@/components/Icon";
import { NavBar } from "@/components/PageHeader";
import { teamName } from "@/components/TeamBadge";
import { tierLabel } from "@/components/TierBadge";
import { chip, GroupLabel, primaryButton, quietButton, Segmented, textInput } from "@/components/ui";
import { defaultFillScore, targetTiersError, type TargetTier } from "@/lib/domain/rankingMatch";
import { effectiveTier, estimatedAvg, isValidSizes } from "@/lib/domain/teams";
import { formatAmount } from "@/lib/format";
import { matchesName } from "@/lib/name-search";
import { saveSetup, type SetupPayload } from "../../actions";
import { TeamBoard } from "./TeamBoard";

export type SetupPerson = {
  id: string;
  name: string;
  tier: number | null;
  avg: number | null;
  /** 핸디표 기본값 */
  baseHandicap: number;
};

type TierDraft = { minTotal: string; prize: string };

const STEPS = ["참가자", "구성"];

function parseHandicap(value: string | undefined) {
  if (value === undefined || value.trim() === "") return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 && n <= 300 ? n : null;
}

export function SetupWizard({
  matchId,
  back,
  people,
  initial,
}: {
  matchId: string;
  back: string;
  people: SetupPerson[];
  initial: {
    format: "team" | "target";
    selected: string[];
    handicaps: Record<string, string>;
    teamCount: number;
    assign: Record<string, number>;
    fills: Record<number, string>;
    tiers: TierDraft[];
  };
}) {
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState(initial.selected);
  const [query, setQuery] = useState("");
  const [handicaps, setHandicaps] = useState(initial.handicaps);
  const [format, setFormat] = useState(initial.format);
  const [teamCount, setTeamCount] = useState(initial.teamCount);
  const [assign, setAssign] = useState(initial.assign);
  const [fills, setFills] = useState(initial.fills);
  const [tiers, setTiers] = useState<TierDraft[]>(
    initial.tiers.length > 0 ? initial.tiers : [{ minTotal: "", prize: "" }],
  );
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const byId = new Map(people.map((p) => [p.id, p]));
  const chosen = selected.map((id) => byId.get(id)!).filter(Boolean);
  const term = query.trim();
  const visible = term ? people.filter((p) => matchesName(p.name, term)) : people;

  const handicapOf = (p: SetupPerson) => handicaps[p.id] ?? String(p.baseHandicap);
  const badHandicap = chosen.find((p) => parseHandicap(handicapOf(p)) === null);

  const teamNos = Array.from({ length: teamCount }, (_, i) => i + 1);
  const teamOf = (id: string) => (assign[id] && assign[id] <= teamCount ? assign[id] : null);
  const sizes = teamNos.map((t) => chosen.filter((p) => teamOf(p.id) === t).length);
  const biggest = Math.max(...sizes);
  const allAssigned = chosen.every((p) => teamOf(p.id) !== null);
  const shortTeams = allAssigned ? teamNos.filter((t, i) => sizes[i] < biggest) : [];
  const fillDefault = defaultFillScore(
    chosen.map((p) => estimatedAvg({ id: p.id, tier: effectiveTier(p.tier), avg: p.avg })),
  );
  const fillOf = (t: number) => fills[t] ?? String(fillDefault);

  const sumHandicaps = (list: SetupPerson[]) => list.reduce((sum, p) => sum + (parseHandicap(handicapOf(p)) ?? 0), 0);

  const parsedTiers: TargetTier[] = tiers.map((t) => ({ minTotal: Number(t.minTotal), prize: Number(t.prize) }));

  function setupProblem() {
    if (format === "target") return targetTiersError(parsedTiers);
    if (chosen.length < teamCount) return `참가자 수보다 팀이 많아요.`;
    if (!allAssigned) return `${chosen.filter((p) => teamOf(p.id) === null).length}명이 아직 팀에 배정되지 않았어요.`;
    if (!isValidSizes(sizes)) return "팀 간 인원 차이는 최대 1명이어야 해요.";
    if (shortTeams.some((t) => parseHandicap(fillOf(t)) === null)) return "꼭두각시 점수는 0~300 사이 숫자로 입력해주세요.";
    return null;
  }

  const problem =
    step === 0
      ? chosen.length < 2
        ? "참가자를 2명 이상 골라주세요."
        : null
      : (setupProblem() ?? (badHandicap ? `${badHandicap.name} 핸디는 0~300 사이 숫자로 입력해주세요.` : null));

  function editHandicap(id: string, value: string) {
    setHandicaps((prev) => ({ ...prev, [id]: value }));
  }

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  }

  function moveToTeam(id: string, teamNo: number | null) {
    setAssign((prev) => {
      const next = { ...prev };
      if (teamNo === null) delete next[id];
      else next[id] = teamNo;
      return next;
    });
  }

  function save() {
    const payload: SetupPayload = {
      format,
      entries: chosen.map((p) => ({
        memberId: p.id,
        handicap: parseHandicap(handicapOf(p))!,
        teamNo: format === "team" ? teamOf(p.id) : null,
      })),
      tiers: format === "target" ? parsedTiers : [],
      fills: format === "team" ? shortTeams.map((t) => ({ teamNo: t, fill: Number(fillOf(t)) })) : [],
    };
    setError(undefined);
    startTransition(async () => {
      const result = await saveSetup(matchId, payload);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div>
      <NavBar title="참가자·구성" back={back} backLabel="랭킹전" />
      <Steps steps={STEPS} at={step} />

      {step === 0 && (
        <section>
          <h2 className="px-5 pt-6 pb-2 text-xl font-bold">
            참가자 <span className="text-accent">{chosen.length}</span>명
          </h2>
          <div className="mx-5 mb-2.5">
            <label htmlFor="ranking-member-search" className="sr-only">
              회원 검색
            </label>
            <div className="flex h-10 items-center gap-2 rounded-[10px] bg-fill px-3">
              <Icon name="search" size={16} strokeWidth={2} className="text-muted" />
              <input
                id="ranking-member-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`${people.length}명 중 검색 (초성도 돼요)`}
                className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted"
              />
            </div>
          </div>
          <ul className="mx-5 overflow-hidden rounded-2xl bg-surface">
            {visible.map((p) => {
              const on = selected.includes(p.id);
              return (
                <li key={p.id} className="border-b border-separator last:border-b-0">
                  <button
                    type="button"
                    onClick={() => toggle(p.id)}
                    aria-pressed={on}
                    className="flex min-h-[50px] w-full items-center gap-3 px-4 py-1.5 text-left"
                  >
                    <span
                      aria-hidden
                      className={`flex size-[22px] shrink-0 items-center justify-center rounded-md border ${
                        on ? "border-accent bg-accent text-white" : "border-edge"
                      }`}
                    >
                      {on && <Icon name="check" size={16} strokeWidth={2.6} />}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-base">{p.name}</span>
                    <span className="shrink-0 text-right text-[13px] text-muted">
                      {tierLabel(p.tier)} · {p.avg === null ? "기록 없음" : `에버 ${Math.round(p.avg)}`}
                    </span>
                  </button>
                </li>
              );
            })}
            {visible.length === 0 && (
              <li className="px-4 py-5 text-[15px] text-muted">&ldquo;{term}&rdquo; 이름을 찾을 수 없어요.</li>
            )}
          </ul>
        </section>
      )}

      {step === 1 && (
        <section className="pt-5">
          <Segmented
            label="진행 형식"
            value={format}
            onSelect={(key) => setFormat(key as "team" | "target")}
            options={[
              { key: "team", label: "팀전" },
              { key: "target", label: "점수 넘기기" },
            ]}
            className="mx-5"
          />

          {format === "team" ? (
            <>
              <GroupLabel className="px-6 pt-4">팀 수</GroupLabel>
              <div className="scrollbar-none flex gap-2 overflow-x-auto px-5 pt-2 pb-1">
                {Array.from({ length: Math.max(0, Math.min(chosen.length, 8) - 1) }, (_, i) => i + 2).map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setTeamCount(count)}
                    aria-pressed={teamCount === count}
                    className={chip(teamCount === count)}
                  >
                    {count}팀
                  </button>
                ))}
              </div>

              <GroupLabel className="px-6 pt-4">팀 배정</GroupLabel>
              <TeamBoard
                people={chosen}
                teamNos={teamNos}
                teamOf={teamOf}
                onMove={moveToTeam}
                handicapOf={handicapOf}
                isChanged={(p) => parseHandicap(handicapOf(p)) !== p.baseHandicap}
                sumHandicaps={sumHandicaps}
                onHandicap={editHandicap}
              />

              {shortTeams.map((t) => (
                <div key={t} className="mx-5 mt-3 flex items-center gap-3 rounded-2xl bg-surface px-4 py-3.5">
                  <label htmlFor={`fill-${t}`} className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-[15px] font-semibold">{teamName(t)} 꼭두각시 점수</span>
                    <span className="text-xs text-muted">게임마다 더해요 · 참가자 평균 {fillDefault}</span>
                  </label>
                  <input
                    id={`fill-${t}`}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={300}
                    value={fillOf(t)}
                    onChange={(e) => setFills((prev) => ({ ...prev, [t]: e.target.value }))}
                    onFocus={(e) => e.target.select()}
                    className="h-11 w-[72px] rounded-[10px] border border-edge text-center text-xl font-bold outline-none focus:border-accent"
                  />
                </div>
              ))}
              <p className="px-6 pt-2 text-xs leading-normal text-muted">
                3게임 동안 같은 팀이에요. 1등 팀 대표자 1명이 상금 10만원을 받아요.
              </p>
            </>
          ) : (
            <>
              <GroupLabel className="px-6 pt-4">구간 (전원 3게임 합 + 핸디)</GroupLabel>
              <div className="flex flex-col gap-2 px-5 pt-2">
                {tiers.map((tier, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="number"
                      inputMode="numeric"
                      aria-label={`${i + 1}구간 기준 점수`}
                      placeholder="기준 점수"
                      value={tier.minTotal}
                      onChange={(e) => setTiers((prev) => prev.map((t, n) => (n === i ? { ...t, minTotal: e.target.value } : t)))}
                      className={textInput}
                    />
                    <input
                      type="number"
                      inputMode="numeric"
                      step={10000}
                      aria-label={`${i + 1}구간 상금`}
                      placeholder="상금"
                      value={tier.prize}
                      onChange={(e) => setTiers((prev) => prev.map((t, n) => (n === i ? { ...t, prize: e.target.value } : t)))}
                      className={textInput}
                    />
                    <button
                      type="button"
                      onClick={() => setTiers((prev) => prev.filter((_, n) => n !== i))}
                      disabled={tiers.length === 1}
                      aria-label={`${i + 1}구간 삭제`}
                      className="flex size-11 shrink-0 items-center justify-center text-muted disabled:opacity-30"
                    >
                      <Icon name="close" size={18} strokeWidth={2} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setTiers((prev) => [...prev, { minTotal: "", prize: "" }])}
                  className="flex min-h-11 items-center gap-1 self-start text-[15px] text-link"
                >
                  <Icon name="plus" size={16} strokeWidth={2} />
                  구간 추가
                </button>
              </div>
              <p className="px-6 pt-1 text-xs leading-normal text-muted">
                기준 점수 이상이면 달성이에요. 상금은 최대 {formatAmount(100000)}원이고, 참가자 중 대표자 1명이 받아요.
              </p>

              <GroupLabel className="px-6 pt-4">핸디 · 합의한 값이 있으면 고쳐주세요</GroupLabel>
              <ul className="mx-5 mt-2 overflow-hidden rounded-2xl bg-surface">
                {chosen.map((p) => {
                  const value = handicapOf(p);
                  const changed = parseHandicap(value) !== p.baseHandicap;
                  return (
                    <li key={p.id} className="flex min-h-[52px] items-center gap-3 border-b border-separator px-4 last:border-b-0">
                      <label htmlFor={`handicap-${p.id}`} className="min-w-0 flex-1">
                        <span className="block truncate text-base">{p.name}</span>
                        <span className={`text-xs ${changed ? "text-accent" : "text-muted"}`}>
                          {tierLabel(p.tier)}
                          {changed && ` · 합의 조정 (기본 ${p.baseHandicap})`}
                        </span>
                      </label>
                      <span className="text-[15px] font-semibold text-accent">+</span>
                      <input
                        id={`handicap-${p.id}`}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={300}
                        value={value}
                        onChange={(e) => editHandicap(p.id, e.target.value)}
                        onFocus={(e) => e.target.select()}
                        className="h-11 w-[72px] rounded-[10px] border border-edge text-center text-xl font-bold outline-none focus:border-accent"
                      />
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>
      )}

      <BottomBar>
        {(error || problem) && <p className="text-center text-sm text-danger">{error ?? problem}</p>}
        <div className={step > 0 ? "grid grid-cols-[1fr_2fr] gap-2.5" : ""}>
          {step > 0 && (
            <button type="button" onClick={() => setStep(step - 1)} className={quietButton}>
              이전
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button type="button" onClick={() => setStep(step + 1)} disabled={!!problem} className={primaryButton}>
              다음
            </button>
          ) : (
            <button type="button" onClick={save} disabled={pending || !!problem} className={primaryButton}>
              {pending ? "저장 중…" : "구성 확정"}
            </button>
          )}
        </div>
      </BottomBar>
    </div>
  );
}
