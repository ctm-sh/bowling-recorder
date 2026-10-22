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
import { useMemo, useState, useTransition, type ReactNode } from "react";
import { TierBadge } from "@/components/TierBadge";
import {
  assignGroupsByOrder,
  assignRandom,
  defaultFillScores,
  effectiveTier,
  formations,
  lineupError,
  matchupHandicaps,
  netTeamHandicaps,
  teamHandicaps,
} from "@/lib/domain/teams";
import type { HandicapTable, Player, Slot } from "@/lib/domain/types";
import { teamColor } from "@/lib/teamColors";
import { createGame, type GamePayload } from "../actions";

export type BuilderPerson = { id: string; name: string; tier: number | null; avg: number | null };

/** 서버에서 만든 첫 라인업 (랜덤 첫 배정 또는 "팀 그대로" 복사). 랜덤을 서버에서 정해야 hydration이 어긋나지 않는다. */
export type BuilderInitial = {
  mode: "random" | "manual";
  slots: Slot[];
  /** 팀별 합의 조정한 순 핸디 */
  overrides: Record<number, number>;
  /** "팀 그대로"로 불러온 원본 게임 번호 */
  sourceGameNo?: number;
};

/** 팀별 합의 조정한 순 핸디 (입력 중인 문자열). 없으면 기본값을 쓴다. */
type Overrides = Record<number, string>;

function toOverrides(initial: BuilderInitial): Overrides {
  return Object.fromEntries(Object.entries(initial.overrides).map(([teamNo, h]) => [teamNo, String(h)]));
}

const PUPPET = "꼭두각시";

export function TeamBuilder({
  sessionId,
  people,
  handicapTable,
  initial,
}: {
  sessionId: string;
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
  const [overrides, setOverrides] = useState<Overrides>(() => toOverrides(initial));
  const [copiedFrom, setCopiedFrom] = useState(initial.sourceGameNo);
  const [dragging, setDragging] = useState<string | null>(null);
  const [editPeople, setEditPeople] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  // 라인업이 바뀌면 합의값은 초기화한다 (기본값이 달라지므로)
  function lineupChanged() {
    setOverrides({});
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
    if (next === "manual") setManual(Object.fromEntries(slots.map((s) => [s.memberId, s.teamNo])));
    else reshuffle();
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

  // 사람 위에 놓으면 둘의 자리를 맞바꾸고, 직접 구성에서는 팀 카드에 놓으면 그 팀으로 옮긴다
  function onDragEnd(e: DragEndEvent) {
    setDragging(null);
    const id = String(e.active.id);
    const over = e.over ? String(e.over.id) : null;
    if (!over) return;
    if (over.startsWith("m:")) swapMembers(id, over.slice(2));
    else if (over.startsWith("t:") && mode === "manual") {
      const teamNo = Number(over.slice(2));
      if (manual[id] !== teamNo) assignManual(id, teamNo);
    }
  }

  function swapMembers(aId: string, bId: string) {
    if (aId === bId) return;
    if (mode === "manual") {
      const [ta, tb] = [manual[aId], manual[bId]];
      if (!ta || !tb || ta === tb) return;
      setManual((prev) => ({ ...prev, [aId]: tb, [bId]: ta }));
      return lineupChanged();
    }
    const a = slots.find((s) => s.memberId === aId)!;
    const b = slots.find((s) => s.memberId === bId)!;
    if (a.teamNo === b.teamNo) return;
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

  // 확정에 쓸 최종 라인업 (직접 구성은 모두 배정돼야 만들어진다)
  const unassigned = participants.filter((p) => !manual[p.id]).length;
  const finalSlots: Slot[] | null =
    mode === "random"
      ? slots
      : unassigned > 0
        ? null
        : assignGroupsByOrder(
            Array.from({ length: teamCount }, (_, i) => participants.filter((p) => manual[p.id] === i + 1)),
          );
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
  const memberSums = valid ? teamHandicaps(valid, given) : {};
  // 순 핸디: (팀원 핸디 합 + 꼭두각시 점수)를 팀끼리 비교해 가장 적은 팀을 0으로
  const netDefaults: Record<number, number> = valid
    ? netTeamHandicaps(
        Object.fromEntries(
          Array.from({ length: teamCount }, (_, i) => [i + 1, (memberSums[i + 1] ?? 0) + (fillDefaults[i + 1] ?? 0)]),
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
      : participants.filter((p) => manual[p.id] === teamNo).map((p) => ({ memberId: p.id, teamNo, groupNo: 0 }));
    const netDefault = netDefaults[teamNo] ?? 0;
    const fillDefault = fillDefaults[teamNo] ?? null;
    const override = overrides[teamNo];
    const net = override ?? String(netDefault);
    return { teamNo, memberSlots, netDefault, fillDefault, override, net };
  });

  function opponents(slot: Slot) {
    if (!valid) return [];
    const names = valid
      .filter((s) => s.groupNo === slot.groupNo && s.teamNo !== slot.teamNo)
      .map((s) => byId.get(s.memberId)!.name);
    return slot.groupNo === puppetGroup ? [...names, PUPPET] : names;
  }

  const teamOf = (id: string) => teams.find((t) => t.memberSlots.some((s) => s.memberId === id))?.teamNo;

  function setOverride(teamNo: number, value: string) {
    setOverrides((prev) => ({ ...prev, [teamNo]: value }));
  }

  function confirm() {
    if (!finalSlots || problem) return;
    const payloadTeams: GamePayload["teams"] = [];
    for (const t of teams) {
      const handicap = Number(t.net);
      if (!(Number.isInteger(handicap) && handicap >= 0 && handicap <= 1000)) {
        return setError(`${t.teamNo}팀 핸디는 0~1000 사이 숫자로 입력해주세요.`);
      }
      payloadTeams.push({ teamNo: t.teamNo, handicap });
    }
    startTransition(async () => {
      const result = await createGame(sessionId, { mode, slots: finalSlots, teams: payloadTeams });
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="pb-40">
      {copiedFrom && (
        <p className="mx-4 mt-4 rounded-xl bg-brand-soft p-3 text-sm text-brand">
          {copiedFrom}게임 팀을 그대로 불러왔어요. 확인하고 확정하세요.
        </p>
      )}

      {/* 참여자 */}
      <section className="px-4 pt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-bold">
            참여 {participants.length}명
            {excluded.size > 0 && <span className="ml-1 font-normal text-muted">(쉬는 사람 {excluded.size}명)</span>}
          </span>
          <button onClick={() => setEditPeople(!editPeople)} className="text-brand underline">
            {editPeople ? "닫기" : "참여자 변경"}
          </button>
        </div>
        {editPeople && (
          <ul className="mt-2 flex flex-wrap gap-2">
            {people.map((p) => {
              const on = !excluded.has(p.id);
              return (
                <li key={p.id}>
                  <button
                    onClick={() => toggleParticipant(p.id)}
                    aria-pressed={on}
                    className={`rounded-full border px-3 py-1.5 text-sm ${
                      on ? "border-brand bg-brand-soft font-bold text-brand" : "border-line text-muted line-through"
                    }`}
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
      <section className="pt-4">
        <h2 className="px-4 text-sm font-bold">팀 형태</h2>
        <div className="mt-2 flex gap-2 overflow-x-auto px-4 pb-1">
          {formations(participants.length).map((f) => (
            <button
              key={f.teams}
              onClick={() => changeTeamCount(f.teams)}
              aria-pressed={teamCount === f.teams}
              className={`shrink-0 rounded-xl border px-3 py-2 text-sm ${
                teamCount === f.teams ? "border-brand bg-brand font-bold text-white" : "border-line"
              }`}
            >
              {f.teams === participants.length ? "개인전" : `${f.teams}팀`}
              <span className="ml-1 text-xs opacity-80">{f.sizes.join("·")}</span>
            </button>
          ))}
        </div>
      </section>

      {/* 구성 방식 */}
      <section className="px-4 pt-4">
        <div className="grid grid-cols-2 rounded-xl bg-background p-1 text-sm">
          {(["random", "manual"] as const).map((m) => (
            <button
              key={m}
              onClick={() => changeMode(m)}
              aria-pressed={mode === m}
              className={`rounded-lg py-2 ${mode === m ? "bg-surface font-bold text-brand shadow-sm" : "text-muted"}`}
            >
              {m === "random" ? "🎲 랜덤" : "✋ 직접 구성"}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">
          {mode === "random"
            ? "에버가 비슷한 사람끼리 상대가 돼요. 사람을 꾹 눌러 다른 팀 사람 위로 끌어다 놓으면 자리를 바꿔요."
            : "팀 번호를 눌러 배정하거나, 팀 카드의 사람을 꾹 눌러 다른 팀으로 끌어다 놓으세요. 상대방은 팀 안 에버 순서대로 정해져요."}
        </p>
      </section>

      {/* 직접 구성: 배정 목록 */}
      {mode === "manual" && (
        <ul className="mt-3 border-t border-line">
          {participants
            .map((p) => byId.get(p.id)!)
            .map((p) => (
              <li key={p.id} className="flex items-center gap-2 border-b border-line px-4 py-2">
                <TierBadge tier={p.tier} />
                <span className="min-w-0 flex-1 truncate text-sm font-bold">{p.name}</span>
                <div className="flex gap-1">
                  {Array.from({ length: teamCount }, (_, i) => i + 1).map((t) => (
                    <button
                      key={t}
                      onClick={() => assignManual(p.id, t)}
                      aria-pressed={manual[p.id] === t}
                      className="size-9 rounded-lg border-2 text-sm font-bold"
                      style={
                        manual[p.id] === t
                          ? { background: teamColor(t), borderColor: teamColor(t), color: "white" }
                          : { borderColor: "var(--line)" }
                      }
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </li>
            ))}
        </ul>
      )}

      {/* 팀 카드 */}
      <DndContext
        id="team-builder"
        sensors={sensors}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setDragging(null)}
      >
        <section className="flex flex-col gap-3 px-4 pt-4">
          {teams.map((t) => {
            const adjusted = t.override !== undefined && Number(t.override) !== t.netDefault;
            // 핸디는 받는 팀에만 표시한다 (합의로 바꾼 팀은 계속 표시)
            const receives = valid && (t.netDefault > 0 || t.override !== undefined);
            return (
              <DropTeam key={t.teamNo} teamNo={t.teamNo} enabled={mode === "manual"}>
                <div className="flex items-center gap-2 bg-background px-4 py-2.5">
                  <span className="size-3 rounded-full" style={{ background: teamColor(t.teamNo) }} aria-hidden />
                  <span className="font-bold">{t.teamNo}팀</span>
                  <span className="text-xs text-muted">{t.memberSlots.length}명</span>
                </div>

                <ul>
                  {t.memberSlots.map((s) => {
                    const p = byId.get(s.memberId)!;
                    const vs = opponents(s);
                    return (
                      <DragMember
                        key={s.memberId}
                        id={s.memberId}
                        teamNo={t.teamNo}
                        dragging={dragging}
                        byTeam={teamOf}
                      >
                        <TierBadge tier={p.tier} />
                        <span className="font-bold">{p.name}</span>
                        <span className="text-xs text-muted">{p.avg === null ? "기록 없음" : Math.round(p.avg)}</span>
                        {(given.get(s.memberId) ?? 0) > 0 && (
                          <span className="rounded bg-brand-soft px-1.5 text-xs font-bold text-brand">
                            +{given.get(s.memberId)}
                          </span>
                        )}
                        <span className="ml-auto truncate text-xs text-muted">
                          {vs.length > 0 && `vs ${vs.join(", ")}`}
                        </span>
                        <span className="text-lg leading-none text-muted/60" aria-hidden>
                          ⠿
                        </span>
                      </DragMember>
                    );
                  })}
                  {t.fillDefault !== null && (
                    <li className="flex items-center gap-2 border-t border-dashed border-line bg-background/60 px-4 py-2.5">
                      <span className="text-lg leading-none" aria-hidden>
                        🎎
                      </span>
                      <span className="font-bold">{PUPPET}</span>
                      <span className="rounded bg-brand-soft px-1.5 text-xs font-bold text-brand">
                        +{t.fillDefault}
                      </span>
                      <span className="ml-auto truncate text-xs text-muted">{puppetSources.join(", ")} 에버</span>
                    </li>
                  )}
                  {t.memberSlots.length === 0 && (
                    <li className="border-t border-line px-4 py-3 text-sm text-muted">아직 아무도 없어요.</li>
                  )}
                </ul>

                {receives && (
                  <label className="flex items-center gap-2 border-t border-line px-4 py-3 text-sm">
                    <span className="font-bold text-brand">받는 핸디</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={t.net}
                      onChange={(e) => setOverride(t.teamNo, e.target.value)}
                      className="h-10 w-20 rounded-lg border-2 border-brand text-center text-base font-bold text-brand outline-none"
                    />
                    {adjusted && <span className="text-xs font-bold text-brand">합의 조정 (기본 {t.netDefault})</span>}
                  </label>
                )}
              </DropTeam>
            );
          })}
        </section>
        <DragOverlay dropAnimation={null}>
          {dragging && (
            <div className="flex items-center gap-2 rounded-xl border-2 border-brand bg-surface px-4 py-2.5 shadow-lg">
              <TierBadge tier={byId.get(dragging)!.tier} />
              <span className="font-bold">{byId.get(dragging)!.name}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <div className="fixed inset-x-0 bottom-16 z-20 mx-auto max-w-[480px] border-t border-line bg-surface p-3">
        {(error || problem) && <p className="mb-2 text-sm text-danger">{error ?? problem}</p>}
        <div className="flex gap-2">
          {mode === "random" && (
            <button
              onClick={() => reshuffle()}
              disabled={pending}
              className="h-14 flex-1 rounded-xl bg-brand-soft text-base font-bold text-brand"
            >
              🎲 다시 섞기
            </button>
          )}
          <button
            onClick={confirm}
            disabled={pending || !!problem}
            className="h-14 flex-1 rounded-xl bg-brand text-base font-bold text-white disabled:opacity-40"
          >
            {pending ? "저장 중…" : "확정 →"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** 팀 카드. 직접 구성에서는 사람을 끌어다 놓을 수 있다 */
function DropTeam({ teamNo, enabled, children }: { teamNo: number; enabled: boolean; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `t:${teamNo}`, disabled: !enabled });
  return (
    <div
      ref={setNodeRef}
      className={`overflow-hidden rounded-2xl border ${isOver ? "border-2 border-brand" : "border-line"}`}
    >
      {children}
    </div>
  );
}

/** 끌 수 있고, 다른 팀 사람을 위에 놓으면 자리를 바꾸는 줄 */
function DragMember({
  id,
  teamNo,
  dragging,
  byTeam,
  children,
}: {
  id: string;
  teamNo: number;
  dragging: string | null;
  byTeam: (id: string) => number | undefined;
  children: ReactNode;
}) {
  const drag = useDraggable({ id });
  const drop = useDroppable({ id: `m:${id}` });
  // 같은 팀끼리는 바꿀 게 없으니 강조하지 않는다
  const target = drop.isOver && dragging !== null && dragging !== id && byTeam(dragging) !== teamNo;
  return (
    <li
      ref={(node) => {
        drag.setNodeRef(node);
        drop.setNodeRef(node);
      }}
      {...drag.attributes}
      {...drag.listeners}
      className={`flex cursor-grab touch-manipulation items-center gap-2 border-t border-line px-4 py-2.5 select-none [-webkit-touch-callout:none] ${
        drag.isDragging ? "opacity-30" : ""
      } ${target ? "bg-brand-soft outline-2 -outline-offset-2 outline-brand" : ""}`}
    >
      {children}
    </li>
  );
}
