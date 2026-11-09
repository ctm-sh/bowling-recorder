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
} from "@dnd-kit/core";
import { useState, type ReactNode, type SyntheticEvent } from "react";
import { TeamBadge } from "@/components/TeamBadge";
import { tierLabel } from "@/components/TierBadge";
import type { SetupPerson } from "./SetupWizard";

/** 입력칸을 누르거나 타이핑할 때 끌기가 시작되지 않게 한다 */
const stop = (e: SyntheticEvent) => e.stopPropagation();

/**
 * 맨 위에 팀이 나란히 있고, 아래 미배정 칸의 이름을 끌어 팀에 넣는다.
 * 팀에 들어간 사람은 그 자리에서 핸디를 고치고, 팀별 핸디 합을 바로 비교할 수 있다.
 */
export function TeamBoard({
  people,
  teamNos,
  teamOf,
  onMove,
  handicapOf,
  isChanged,
  sumHandicaps,
  onHandicap,
}: {
  people: SetupPerson[];
  teamNos: number[];
  teamOf: (id: string) => number | null;
  onMove: (id: string, teamNo: number | null) => void;
  handicapOf: (person: SetupPerson) => string;
  isChanged: (person: SetupPerson) => boolean;
  sumHandicaps: (list: SetupPerson[]) => number;
  onHandicap: (id: string, value: string) => void;
}) {
  const [dragging, setDragging] = useState<string | null>(null);
  // 휴대폰은 꾹 눌렀다가 끌고(스크롤과 구분), 마우스는 조금 움직이면 바로 끈다
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  function onDragEnd(e: DragEndEvent) {
    setDragging(null);
    const over = e.over ? String(e.over.id) : null;
    if (!over) return;
    onMove(String(e.active.id), over === "pool" ? null : Number(over.slice(5)));
  }

  const unassigned = people.filter((p) => teamOf(p.id) === null);
  const held = people.find((p) => p.id === dragging);

  return (
    <DndContext
      id="ranking-team-board"
      sensors={sensors}
      onDragStart={(e) => {
        setDragging(String(e.active.id));
        navigator.vibrate?.(10);
      }}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDragging(null)}
    >
      <div className="scrollbar-none overflow-x-auto px-5 pt-2">
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${teamNos.length}, minmax(124px, 1fr))` }}
        >
          {teamNos.map((t) => {
            const members = people.filter((p) => teamOf(p.id) === t);
            return (
              <Zone key={t} id={`team:${t}`} className="flex min-h-[176px] flex-col gap-1.5 rounded-2xl bg-surface p-2">
                <span className="flex items-center gap-1.5 px-1 pb-1 text-sm font-semibold">
                  <TeamBadge teamNo={t} />
                  <span className="flex-1">{members.length}명</span>
                  <span className="text-xs font-normal text-muted">
                    핸디 <span className="text-[13px] font-bold text-foreground">{sumHandicaps(members)}</span>
                  </span>
                </span>
                {members.map((p) => (
                  <Chip key={p.id} person={p} dragging={dragging === p.id}>
                    <span className="flex items-center gap-0.5" onMouseDown={stop} onTouchStart={stop} onKeyDown={stop}>
                      <span className="text-xs font-semibold text-accent">+</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={300}
                        aria-label={`${p.name} 핸디`}
                        value={handicapOf(p)}
                        onChange={(e) => onHandicap(p.id, e.target.value)}
                        onFocus={(e) => e.target.select()}
                        className="h-8 w-12 min-w-0 rounded-md border border-accent bg-surface text-center text-sm font-bold text-accent outline-none"
                      />
                    </span>
                    {isChanged(p) && (
                      <span className="block basis-full text-[10px] text-accent">합의 조정 · 기본 {p.baseHandicap}</span>
                    )}
                  </Chip>
                ))}
              </Zone>
            );
          })}
        </div>
      </div>

      <Zone id="pool" className="mx-5 mt-2 flex min-h-[72px] flex-col gap-2 rounded-2xl border border-dashed border-edge p-3">
        <span className="text-[13px] font-semibold text-muted">미배정 {unassigned.length}명</span>
        {unassigned.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {unassigned.map((p) => (
              <Chip key={p.id} person={p} dragging={dragging === p.id} />
            ))}
          </div>
        ) : (
          <span className="text-[13px] text-muted">모두 배정했어요. 빼려면 여기로 끌어다 놓아요.</span>
        )}
      </Zone>
      <p className="px-6 pt-2 text-xs leading-normal text-muted">
        이름을 길게 눌러 팀으로 끌어다 놓아요. 팀에 넣으면 핸디를 바로 고칠 수 있어요.
      </p>

      <DragOverlay dropAnimation={null}>{held && <ChipBody person={held} lifted />}</DragOverlay>
    </DndContext>
  );
}

function Zone({ id, className, children }: { id: string; className: string; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`${className} ${isOver ? "ring-2 ring-accent" : ""}`}>
      {children}
    </div>
  );
}

function Chip({ person, dragging, children }: { person: SetupPerson; dragging: boolean; children?: ReactNode }) {
  // 안에 핸디 입력칸이 있어 button 역할을 쓰지 않는다
  const { setNodeRef, attributes, listeners } = useDraggable({ id: person.id, attributes: { role: "group" } });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      aria-label={person.name}
      className={`cursor-grab touch-manipulation select-none [-webkit-touch-callout:none] ${dragging ? "opacity-30" : ""}`}
    >
      <ChipBody person={person}>{children}</ChipBody>
    </div>
  );
}

function ChipBody({ person, lifted, children }: { person: SetupPerson; lifted?: boolean; children?: ReactNode }) {
  return (
    <div
      className={`flex min-h-11 flex-col justify-center rounded-[10px] px-2.5 py-1 ${
        lifted ? "bg-surface shadow-lg ring-2 ring-accent" : "bg-background"
      }`}
    >
      <span className="truncate text-[15px] font-semibold">{person.name}</span>
      <span className="flex flex-wrap items-center justify-between gap-x-1">
        <span className="text-[11px] text-muted">{tierLabel(person.tier)}</span>
        {children}
      </span>
    </div>
  );
}
