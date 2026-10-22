"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import Link from "next/link";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import { BottomBar } from "@/components/Flow";
import { Icon } from "@/components/Icon";
import { TeamBadge, teamLetter, teamName } from "@/components/TeamBadge";
import { tierLabel } from "@/components/TierBadge";
import { chip, GroupLabel, primaryButton, secondaryButton, Segmented } from "@/components/ui";
import {
  assignGroupsInOrder,
  assignRandom,
  defaultFillScores,
  defaultTeamCount,
  effectiveTier,
  formations,
  lineupError,
  matchupHandicaps,
  netTeamHandicaps,
  sortByAvg,
  teamHandicaps,
} from "@/lib/domain/teams";
import type { HandicapTable, Player, Slot } from "@/lib/domain/types";
import { createGame, type GamePayload } from "../actions";

export type BuilderPerson = { id: string; name: string; tier: number | null; avg: number | null };

/** 서버에서 만든 첫 라인업 (랜덤 첫 배정 또는 "팀 그대로" 복사). 랜덤을 서버에서 정해야 hydration이 어긋나지 않는다. */
export type BuilderInitial = {
  mode: "random" | "manual";
  slots: Slot[];
  /** 팀별 합의 조정한 순 핸디 */
  overrides: Record<number, number>;
  /** 사람별 합의 조정한 개인 핸디 */
  memberHandicaps: Record<string, number>;
  /** 팀별 합의 조정한 꼭두각시 점수 */
  fills: Record<number, number>;
  /** "팀 그대로"로 불러온 원본 게임 번호 */
  sourceGameNo?: number;
};

/** 팀별 합의 조정한 순 핸디 (입력 중인 문자열). 없으면 기본값을 쓴다. */
type Overrides = Record<number, string>;

function toStrings<K extends string | number>(values: Record<K, number>): Record<K, string> {
  return Object.fromEntries(Object.entries(values).map(([k, v]) => [k, String(v)])) as Record<K, string>;
}

/** 개인 핸디·꼭두각시 점수 입력값. 0~300 정수가 아니면 null */
function parseScore(value: string | undefined) {
  if (value === undefined || value.trim() === "") return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 && n <= 300 ? n : null;
}

const PUPPET = "꼭두각시";

/** 라인업의 묶음 순서대로 세운 줄 (직접 구성에서 팀 안 순번 = 상대방 순번) */
function orderFrom(slots: Slot[], everyone: Player[]) {
  const ids = [...slots].sort((a, b) => a.groupNo - b.groupNo || a.teamNo - b.teamNo).map((s) => s.memberId);
  const placed = new Set(ids);
  return [...ids, ...sortByAvg(everyone.filter((p) => !placed.has(p.id))).map((p) => p.id)];
}

export function TeamBuilder({
  sessionId,
  people,
  handicapTable,
  initial,
  previousGameId,
}: {
  sessionId: string;
  /** "이전 팀 그대로"로 불러올 직전 게임 */
  previousGameId?: string;
  people: BuilderPerson[];
  handicapTable: HandicapTable;
  initial: BuilderInitial;
}) {
  const byId = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const allPlayers: Player[] = useMemo(
    () => people.map((p) => ({ id: p.id, tier: effectiveTier(p.tier), avg: p.avg })),
    [people],
  );

  // "팀 그대로"로 불러온 사람 중 지금 참석자가 아닌 사람은 뺀다
  const [initialSlots] = useState(() => initial.slots.filter((s) => byId.has(s.memberId)));
  const [excluded, setExcluded] = useState<Set<string>>(() => {
    const inGame = new Set(initialSlots.map((s) => s.memberId));
    return new Set(people.filter((p) => !inGame.has(p.id)).map((p) => p.id));
  });
  const participants = allPlayers.filter((p) => !excluded.has(p.id));

  const [teamCount, setTeamCount] = useState(() => Math.max(2, ...initialSlots.map((s) => s.teamNo)));
  const [mode, setMode] = useState<"random" | "manual">(initial.mode);
  const [slots, setSlots] = useState<Slot[]>(initialSlots);
  const [manual, setManual] = useState<Record<string, number>>(() =>
    Object.fromEntries(initialSlots.map((s) => [s.memberId, s.teamNo])),
  );
  // 직접 구성의 세운 순서. 팀 안에서 같은 순번끼리 상대방이 된다.
  const [order, setOrder] = useState<string[]>(() => orderFrom(initialSlots, allPlayers));
  const [overrides, setOverrides] = useState<Overrides>(() => toStrings(initial.overrides));
  // 합의로 바꾼 개인 핸디·꼭두각시 점수 (입력 중인 문자열). 없으면 기본값을 쓴다.
  const [memberEdits, setMemberEdits] = useState<Record<string, string>>(() => toStrings(initial.memberHandicaps));
  const [fillEdits, setFillEdits] = useState<Record<number, string>>(() => toStrings(initial.fills));
  const [editHandicaps, setEditHandicaps] = useState(false);
  const [copiedFrom, setCopiedFrom] = useState(initial.sourceGameNo);
  const [dragging, setDragging] = useState<string | null>(null);
  const [editPeople, setEditPeople] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  // 라인업이 바뀌면 합의값은 초기화한다 (기본값이 달라지므로)
  function lineupChanged() {
    setOverrides({});
    setMemberEdits({});
    setFillEdits({});
    setCopiedFrom(undefined);
    setError(undefined);
  }

  function reshuffle(list = participants, count = teamCount) {
    setSlots(assignRandom(list, count));
    lineupChanged();
  }

  function toggleParticipant(id: string) {
    const next = new Set(excluded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    const list = allPlayers.filter((p) => !next.has(p.id));
    if (list.length < 2) return;
    const count = Math.min(teamCount, list.length);
    setExcluded(next);
    setTeamCount(count);
    if (mode === "random") reshuffle(list, count);
    else {
      setManual((prev) => Object.fromEntries(Object.entries(prev).filter(([m]) => !next.has(m))));
      lineupChanged();
    }
  }

  function changeTeamCount(count: number) {
    setTeamCount(count);
    if (mode === "random") reshuffle(participants, count);
    else {
      setManual((prev) => Object.fromEntries(Object.entries(prev).filter(([, t]) => t <= count)));
      lineupChanged();
    }
  }

  function changeMode(next: "random" | "manual") {
    if (next === mode) return;
    setMode(next);
    if (next === "manual") {
      // 지금 보이는 상대방 그대로 직접 구성으로 넘어간다
      setManual(Object.fromEntries(slots.map((s) => [s.memberId, s.teamNo])));
      setOrder(orderFrom(slots, allPlayers));
    } else reshuffle();
  }

  // 휴대폰은 꾹 눌렀다가 끌고(스크롤과 구분), 마우스는 조금 움직이면 바로 끈다
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  function onDragStart(e: DragStartEvent) {
    setDragging(String(e.active.id));
    navigator.vibrate?.(10);
  }

  // 사람 위에 놓으면 둘의 자리를 맞바꾸고(같은 팀이면 순번 = 상대방이 바뀐다), 직접 구성에서는 팀 카드에 놓으면 그 팀으로 옮긴다
  function onDragEnd(e: DragEndEvent) {
    setDragging(null);
    const id = String(e.active.id);
    const over = e.over ? String(e.over.id) : null;
    if (!over) return;
    if (over.startsWith("m:")) swapMembers(id, over.slice(2));
    else if (over.startsWith("t:") && mode === "manual") {
      const teamNo = Number(over.slice(2).split(":")[0]);
      if (manual[id] !== teamNo) assignManual(id, teamNo);
    }
  }

  function swapMembers(aId: string, bId: string) {
    if (aId === bId) return;
    if (mode === "manual") {
      const [ta, tb] = [manual[aId], manual[bId]];
      if (!ta || !tb) return;
      setManual((prev) => ({ ...prev, [aId]: tb, [bId]: ta }));
      setOrder((prev) => prev.map((id) => (id === aId ? bId : id === bId ? aId : id)));
      return lineupChanged();
    }
    const a = slots.find((s) => s.memberId === aId)!;
    const b = slots.find((s) => s.memberId === bId)!;
    setSlots(
      slots.map((s) =>
        s.memberId === a.memberId
          ? { ...s, teamNo: b.teamNo, groupNo: b.groupNo }
          : s.memberId === b.memberId
            ? { ...s, teamNo: a.teamNo, groupNo: a.groupNo }
            : s,
      ),
    );
    lineupChanged();
  }

  function assignManual(id: string, teamNo: number) {
    setManual((prev) => ({ ...prev, [id]: teamNo }));
    lineupChanged();
  }

  // 직접 구성: 팀마다 세운 순서대로
  const position = new Map(order.map((id, i) => [id, i]));
  const manualTeam = (teamNo: number) =>
    participants
      .filter((p) => manual[p.id] === teamNo)
      .map((p) => p.id)
      .sort((a, b) => position.get(a)! - position.get(b)!);

  // 확정에 쓸 최종 라인업 (직접 구성은 모두 배정돼야 만들어진다)
  const unassigned = participants.filter((p) => !manual[p.id]).length;
  const finalSlots: Slot[] | null =
    mode === "random"
      ? slots
      : unassigned > 0
        ? null
        : assignGroupsInOrder(Array.from({ length: teamCount }, (_, i) => manualTeam(i + 1)));
  const problem = finalSlots
    ? lineupError(
        finalSlots,
        participants.map((p) => p.id),
      )
    : `${unassigned}명이 아직 팀에 배정되지 않았어요.`;
  const valid = finalSlots && !problem ? finalSlots : null;
  const fillDefaults = valid ? defaultFillScores(valid, participants) : {};
  // 상대방끼리 티어 차이만큼 낮은 티어가 받는 핸디 (라인업이 완성돼야 계산된다)
  const given = valid
    ? matchupHandicaps(valid, new Map(participants.map((p) => [p.id, p.tier])), handicapTable)
    : new Map<string, number>();
  // 실제 적용할 개인 핸디·꼭두각시 점수 (합의로 바꾼 값이 있으면 그 값)
  const personal = new Map([...given].map(([id, h]) => [id, parseScore(memberEdits[id]) ?? h] as const));
  const fillOf = (teamNo: number) =>
    fillDefaults[teamNo] === undefined ? null : (parseScore(fillEdits[teamNo]) ?? fillDefaults[teamNo]);
  const memberSums = valid ? teamHandicaps(valid, personal) : {};
  // 순 핸디: (팀원 핸디 합 + 꼭두각시 점수)를 팀끼리 비교해 가장 적은 팀을 0으로
  const netDefaults: Record<number, number> = valid
    ? netTeamHandicaps(
        Object.fromEntries(
          Array.from({ length: teamCount }, (_, i) => [i + 1, (memberSums[i + 1] ?? 0) + (fillOf(i + 1) ?? 0)]),
        ),
      )
    : {};
  // 마지막 묶음(상대 없던 사람들)은 꼭두각시와 붙는다
  const puppetGroup = valid && Object.keys(fillDefaults).length > 0 ? Math.max(...valid.map((s) => s.groupNo)) : null;
  const puppetSources = valid
    ? valid.filter((s) => s.groupNo === puppetGroup).map((s) => byId.get(s.memberId)!.name)
    : [];

  const teams = Array.from({ length: teamCount }, (_, i) => {
    const teamNo = i + 1;
    const memberSlots: Slot[] = finalSlots
      ? finalSlots.filter((s) => s.teamNo === teamNo).sort((a, b) => a.groupNo - b.groupNo)
      : manualTeam(teamNo).map((memberId) => ({ memberId, teamNo, groupNo: 0 }));
    const netDefault = netDefaults[teamNo] ?? 0;
    const fillDefault = fillDefaults[teamNo] ?? null;
    const override = overrides[teamNo];
    const net = override ?? String(netDefault);
    return { teamNo, memberSlots, netDefault, fillDefault, override, net };
  });

  function setOverride(teamNo: number, value: string) {
    setOverrides((prev) => ({ ...prev, [teamNo]: value }));
  }

  // 개인 핸디·꼭두각시를 바꾸면 순 핸디 기본값이 다시 계산되므로 팀 합의값은 지운다
  function editMember(id: string, value: string) {
    setMemberEdits((prev) => ({ ...prev, [id]: value }));
    setOverrides({});
  }

  function editFill(teamNo: number, value: string) {
    setFillEdits((prev) => ({ ...prev, [teamNo]: value }));
    setOverrides({});
  }

  function confirm() {
    if (!finalSlots || problem) return;
    const payloadTeams: GamePayload["teams"] = [];
    for (const t of teams) {
      const handicap = Number(t.net);
      if (!(Number.isInteger(handicap) && handicap >= 0 && handicap <= 1000)) {
        return setError(`${teamName(t.teamNo)} 핸디는 0~1000 사이 숫자로 입력해주세요.`);
      }
      if (t.fillDefault !== null && fillEdits[t.teamNo] !== undefined && parseScore(fillEdits[t.teamNo]) === null) {
        return setError(`${teamName(t.teamNo)} 꼭두각시 점수는 0~300 사이 숫자로 입력해주세요.`);
      }
      payloadTeams.push({ teamNo: t.teamNo, handicap, fill: fillOf(t.teamNo) });
    }
    const bad = finalSlots.find(
      (s) => memberEdits[s.memberId] !== undefined && parseScore(memberEdits[s.memberId]) === null,
    );
    if (bad) return setError(`${byId.get(bad.memberId)!.name} 핸디는 0~300 사이 숫자로 입력해주세요.`);
    const members = finalSlots.map((s) => ({ memberId: s.memberId, handicap: personal.get(s.memberId)! }));
    startTransition(async () => {
      const result = await createGame(sessionId, { mode, slots: finalSlots, teams: payloadTeams, members });
      if (result?.error) setError(result.error);
    });
  }

  // 대진표: 열 = 팀, 행 = 상대 묶음. 라인업이 완성되면 묶음 번호로, 아니면 팀 안 순서로 줄을 맞춘다.
  const rowCount = valid
    ? Math.max(...valid.map((s) => s.groupNo))
    : Math.max(0, ...teams.map((t) => t.memberSlots.length));
  const cellAt = (t: (typeof teams)[number], row: number) =>
    valid ? t.memberSlots.find((s) => s.groupNo === row + 1) : t.memberSlots[row];
  const receiving = teams.filter((t) => t.netDefault > 0 || t.override !== undefined);
  const adjustedTeams = teams.filter((t) => t.override !== undefined && Number(t.override) !== t.netDefault);
  const grid = { gridTemplateColumns: `28px repeat(${teamCount}, minmax(72px, 1fr))` };

  return (
    <div>
      {copiedFrom && (
        <p className="mx-5 mt-4 rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent">
          {copiedFrom}게임 팀을 그대로 불러왔어요. 확인하고 확정하세요.
        </p>
      )}

      {/* 참여자 */}
      <section className="flex flex-col gap-2 px-5 pt-5">
        <div className="flex items-center justify-between">
          <GroupLabel>
            참여 {participants.length}명{excluded.size > 0 && ` · 쉬는 사람 ${excluded.size}명`}
          </GroupLabel>
          <button onClick={() => setEditPeople(!editPeople)} className="min-h-11 px-1 text-[15px] text-link">
            {editPeople ? "닫기" : "참여자 변경"}
          </button>
        </div>
        {editPeople && (
          <ul className="flex flex-wrap gap-2">
            {people.map((p) => {
              const on = !excluded.has(p.id);
              return (
                <li key={p.id}>
                  <button
                    onClick={() => toggleParticipant(p.id)}
                    aria-pressed={on}
                    className={on ? chip(true) : `${chip(false)} text-muted line-through`}
                  >
                    {p.name}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 팀 형태 */}
      <section className="flex flex-col gap-2 pt-4">
        <GroupLabel className="px-6">형태 · {participants.length}명</GroupLabel>
        <div className="scrollbar-none flex gap-2 overflow-x-auto px-5 pb-1">
          {formations(participants.length).map((f) => {
            const on = teamCount === f.teams;
            return (
              <button key={f.teams} onClick={() => changeTeamCount(f.teams)} aria-pressed={on} className={chip(on)}>
                {f.teams === participants.length ? "개인전" : f.sizes.join(" · ")}
                {f.teams === defaultTeamCount(participants.length) && (
                  <span className={`text-[11px] ${on ? "text-dark-muted" : "text-muted"}`}>추천</span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* 구성 방식 */}
      <Segmented
        label="배정 방식"
        value={mode}
        onSelect={(m) => changeMode(m as "random" | "manual")}
        options={[
          { key: "random", label: "랜덤 배정" },
          { key: "manual", label: "직접 구성" },
        ]}
        className="mx-5 mt-4"
      />
      <p className="px-6 pt-2 text-xs leading-normal text-muted">
        {mode === "random"
          ? "에버가 비슷한 사람끼리 상대가 돼요."
          : "팀 글자를 눌러 배정하세요. 팀 안에서 같은 순번끼리 상대방이에요."}
      </p>

      {/* 직접 구성: 배정 목록 */}
      {mode === "manual" && (
        <ul className="mx-5 mt-3 overflow-hidden rounded-2xl bg-surface">
          {participants
            .map((p) => byId.get(p.id)!)
            .map((p) => (
              <li
                key={p.id}
                className="flex min-h-[52px] items-center gap-2 border-b border-separator px-4 last:border-b-0"
              >
                <span className="min-w-0 flex-1 truncate text-base">{p.name}</span>
                <span className="text-[13px] text-muted">{tierLabel(p.tier)}</span>
                <div className="flex gap-1">
                  {Array.from({ length: teamCount }, (_, i) => i + 1).map((t) => (
                    <button
                      key={t}
                      onClick={() => assignManual(p.id, t)}
                      aria-pressed={manual[p.id] === t}
                      aria-label={`${p.name} ${teamName(t)}`}
                      className={`size-11 rounded-full text-[15px] font-semibold ${
                        manual[p.id] === t ? "bg-foreground text-white" : "border border-edge"
                      }`}
                    >
                      {teamLetter(t)}
                    </button>
                  ))}
                </div>
              </li>
            ))}
        </ul>
      )}

      {/* 대진표 */}
      <div className="flex items-baseline justify-between px-5 pt-5 pb-2">
        <h2 className="text-xl font-bold">대진표</h2>
        {valid ? (
          <button
            onClick={() => setEditHandicaps(!editHandicaps)}
            aria-pressed={editHandicaps}
            className="flex min-h-11 items-center gap-1 text-[15px] text-link"
          >
            {editHandicaps ? (
              "수정 완료"
            ) : (
              <>
                <Icon name="pencil" size={14} strokeWidth={2} />
                개인 핸디 수정
              </>
            )}
          </button>
        ) : (
          <span className="text-xs text-muted">가로 한 줄 = 서로의 상대</span>
        )}
      </div>

      <DndContext
        id="team-builder"
        sensors={sensors}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setDragging(null)}
      >
        <div className="scrollbar-none mx-5 overflow-x-auto rounded-2xl bg-surface">
          <div className="min-w-fit">
            <div className="grid gap-1.5 border-b border-separator px-3 pt-3 pb-2" style={grid}>
              <span />
              {teams.map((t) => (
                <DropZone key={t.teamNo} id={`t:${t.teamNo}`} enabled={mode === "manual"}>
                  <span className="flex items-center gap-1.5 text-sm font-semibold">
                    <TeamBadge teamNo={t.teamNo} />
                    {t.memberSlots.length}명
                  </span>
                </DropZone>
              ))}
            </div>

            {Array.from({ length: rowCount }, (_, row) => (
              <div key={row} className="grid items-stretch gap-1.5 border-b border-separator px-3 py-2" style={grid}>
                <span className="flex items-center text-xs text-muted">{row + 1}</span>
                {teams.map((t) => {
                  const s = cellAt(t, row);
                  if (s) {
                    const p = byId.get(s.memberId)!;
                    const h = personal.get(s.memberId) ?? 0;
                    const base = given.get(s.memberId) ?? 0;
                    return (
                      <DragCell key={s.memberId} id={s.memberId} dragging={dragging} disabled={editHandicaps}>
                        <span className="truncate text-[15px] font-semibold">{p.name}</span>
                        {editHandicaps ? (
                          <HandicapInput
                            label={`${p.name} 핸디`}
                            value={memberEdits[s.memberId] ?? String(base)}
                            base={base}
                            current={h}
                            onChange={(v) => editMember(s.memberId, v)}
                          />
                        ) : (
                          <span className={`truncate text-[11px] ${h > 0 ? "text-accent" : "text-muted"}`}>
                            {tierLabel(p.tier)} · {valid ? (h > 0 ? `+${h}` : 0) : "—"}
                            {valid && h !== base && ` (기본 ${base})`}
                          </span>
                        )}
                      </DragCell>
                    );
                  }
                  // 인원이 적은 팀의 마지막 묶음 = 꼭두각시
                  if (valid && row + 1 === puppetGroup && t.fillDefault !== null) {
                    return (
                      <div
                        key={`p${t.teamNo}`}
                        className="flex min-h-[52px] flex-col justify-center gap-px rounded-[10px] border border-separator px-2 py-1.5 text-muted"
                      >
                        <span className="text-[15px] font-semibold">{PUPPET}</span>
                        <span className="text-[11px]">{fillOf(t.teamNo)}점</span>
                      </div>
                    );
                  }
                  return (
                    <DropZone key={`e${t.teamNo}`} id={`t:${t.teamNo}:${row}`} enabled={mode === "manual"}>
                      <div className="min-h-[52px] rounded-[10px] border border-dashed border-separator" />
                    </DropZone>
                  );
                })}
              </div>
            ))}
            {rowCount === 0 && <p className="px-4 py-5 text-[15px] text-muted">아직 아무도 배정되지 않았어요.</p>}

            {valid && (
              <div className="grid items-center gap-1.5 bg-background p-3" style={grid}>
                <span className="text-[11px] leading-tight text-muted">
                  팀<br />
                  핸디
                </span>
                {teams.map((t) => {
                  const receives = receiving.includes(t);
                  return receives ? (
                    <label key={t.teamNo} className="flex min-h-11 items-center">
                      <span className="sr-only">{teamName(t.teamNo)} 핸디 합의 조정</span>
                      <Icon name="pencil" size={14} strokeWidth={2} className="mr-1 text-accent" />
                      <span className="text-xl font-bold">+</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={t.net}
                        onChange={(e) => setOverride(t.teamNo, e.target.value)}
                        onFocus={(e) => e.target.select()}
                        className="w-full min-w-0 bg-transparent text-xl font-bold outline-none focus:text-accent"
                      />
                    </label>
                  ) : (
                    <span key={t.teamNo} className="text-xl font-bold text-muted">
                      0
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <DragOverlay dropAnimation={null}>
          {dragging && (
            <div className="flex min-h-[52px] flex-col justify-center rounded-[10px] bg-surface px-3 py-1.5 shadow-lg ring-2 ring-accent">
              <span className="text-[15px] font-semibold">{byId.get(dragging)!.name}</span>
              <span className="text-[11px] text-muted">{tierLabel(byId.get(dragging)!.tier)}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <p className="mx-6 mt-2 text-xs leading-normal text-muted">
        이름을 길게 눌러 다른 칸으로 옮길 수 있어요. 같은 팀 안에서 순서를 바꾸면 상대가 바뀌어요. 핸디는 같은 줄 상대와
        비교해 받는 값이에요.
        {adjustedTeams.length > 0 &&
          ` 합의 조정: ${adjustedTeams.map((t) => `${teamName(t.teamNo)} 기본 ${t.netDefault}`).join(", ")}.`}
      </p>

      {/* 꼭두각시 점수 */}
      {teams
        .filter((t) => t.fillDefault !== null)
        .map((t) => (
          <div key={t.teamNo} className="mx-5 mt-4 flex items-center gap-3 rounded-2xl bg-surface px-4 py-3.5">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <label htmlFor={`puppet-${t.teamNo}`} className="text-[15px] font-semibold">
                {teamName(t.teamNo)} 꼭두각시 점수
              </label>
              <span className="text-xs text-muted">
                {puppetSources.join(" · ")} 평균 {t.fillDefault}
                {fillOf(t.teamNo) !== t.fillDefault ? " · 합의로 수정함" : " · 합의로 수정"}
              </span>
            </div>
            <input
              id={`puppet-${t.teamNo}`}
              type="number"
              inputMode="numeric"
              min={0}
              max={300}
              value={fillEdits[t.teamNo] ?? String(t.fillDefault)}
              onChange={(e) => editFill(t.teamNo, e.target.value)}
              onFocus={(e) => e.target.select()}
              className="h-11 w-[72px] rounded-[10px] border border-edge text-center text-xl font-bold outline-none focus:border-accent"
            />
          </div>
        ))}

      <div className="mx-5 mt-3 grid grid-cols-2 gap-2.5">
        <button onClick={() => reshuffle()} disabled={pending || mode !== "random"} className={secondaryButton}>
          <Icon name="shuffle" size={18} />
          다시 섞기
        </button>
        {previousGameId && !copiedFrom ? (
          <Link href={`/admin/sessions/${sessionId}/games/new?from=${previousGameId}`} className={secondaryButton}>
            <Icon name="repeat" size={18} />
            이전 팀 그대로
          </Link>
        ) : (
          <button disabled className={secondaryButton}>
            <Icon name="repeat" size={18} />
            이전 팀 그대로
          </button>
        )}
      </div>

      <BottomBar>
        {(error || problem) && <p className="text-center text-sm text-danger">{error ?? problem}</p>}
        <button onClick={confirm} disabled={pending || !!problem} className={primaryButton}>
          {pending ? "저장 중…" : "팀 확정하고 게임 시작"}
        </button>
      </BottomBar>
    </div>
  );
}

/** 놓을 수 있는 자리 (직접 구성에서 팀 머리글·빈 칸에 놓으면 그 팀으로 옮긴다) */
function DropZone({ id, enabled, children }: { id: string; enabled: boolean; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled: !enabled });
  return (
    <div ref={setNodeRef} className={`rounded-[10px] ${isOver ? "ring-2 ring-accent" : ""}`}>
      {children}
    </div>
  );
}

/** 끌 수 있고, 다른 사람을 위에 놓으면 자리를 바꾸는 칸 */
function DragCell({
  id,
  dragging,
  disabled,
  children,
}: {
  id: string;
  dragging: string | null;
  /** 핸디 입력 중에는 끌지 않는다 (입력칸 터치가 끌기로 잡히지 않게) */
  disabled: boolean;
  children: ReactNode;
}) {
  const drag = useDraggable({ id, disabled });
  const drop = useDroppable({ id: `m:${id}`, disabled });
  const target = drop.isOver && dragging !== null && dragging !== id;
  return (
    <div
      ref={(node) => {
        drag.setNodeRef(node);
        drop.setNodeRef(node);
      }}
      {...drag.attributes}
      {...drag.listeners}
      className={`flex min-h-[52px] min-w-0 touch-manipulation flex-col justify-center gap-px rounded-[10px] bg-background px-2 py-1.5 select-none [-webkit-touch-callout:none] ${
        disabled ? "" : "cursor-grab"
      } ${drag.isDragging ? "opacity-30" : ""} ${target ? "bg-accent-soft ring-2 ring-accent" : ""}`}
    >
      {children}
    </div>
  );
}

/** 개인 핸디 입력칸 (대진표 칸 안) */
function HandicapInput({
  label,
  value,
  base,
  current,
  onChange,
}: {
  label: string;
  value: string;
  base: number;
  current: number;
  onChange: (value: string) => void;
}) {
  return (
    <span className="flex items-center gap-1">
      <span className="text-[11px] font-semibold text-accent">+</span>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={300}
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={(e) => e.target.select()}
        className="h-8 w-12 min-w-0 rounded-md border border-accent bg-surface text-center text-sm font-bold text-accent outline-none"
      />
      {current !== base && <span className="text-[10px] text-muted">기본 {base}</span>}
    </span>
  );
}
