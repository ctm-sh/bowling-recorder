"use client";

import { useActionState, useState } from "react";
import { GroupLabel, primaryButton, textInput } from "@/components/ui";
import type { MemberFormState } from "./actions";

type Initial = { name: string; tier: number | null; active: boolean; memo: string | null };

const MAX_TIER = 14;

const tierText = (t: number | null) => (t === null ? "미정" : `${t}티어`);

/**
 * 회원 추가·수정 폼. 수정일 때는 시안의 "결정" 카드(티어 변경 + 사유)와 "회원 정보" 카드로 나눠 보여준다.
 * 저장은 한 번에 (기존 액션 그대로).
 */
export function MemberForm({
  action,
  initial,
  isNew,
  suggestion,
}: {
  action: (prev: MemberFormState, formData: FormData) => Promise<MemberFormState>;
  initial: Initial;
  isNew: boolean;
  /** 승급·강등 후보일 때: 바꿀 티어와 사유 초안 */
  suggestion?: { tier: number; reason: string };
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [tier, setTier] = useState<number | null>(initial.tier);
  const [reason, setReason] = useState("");
  const tierChanged = !isNew && tier !== initial.tier;

  function applySuggestion() {
    if (!suggestion) return;
    setTier(suggestion.tier);
    setReason(suggestion.reason + "\n");
  }

  function step(delta: number) {
    setTier((t) => Math.min(MAX_TIER, Math.max(0, (t ?? (delta > 0 ? -1 : MAX_TIER + 1)) + delta)));
  }

  function hold() {
    setTier(initial.tier);
    setReason("");
  }

  const info = (
    <div className="flex flex-col gap-4 rounded-2xl bg-surface p-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">이름</span>
        <input name="name" required maxLength={20} defaultValue={initial.name} className={textInput} />
      </label>
      <label className="flex min-h-11 items-center gap-3">
        <input type="checkbox" name="active" defaultChecked={initial.active} className="size-[22px] accent-accent" />
        <span className="flex flex-col">
          <span className="text-base">활동 중</span>
          <span className="text-xs text-muted">끄면 참석 체크 목록에서 숨겨요 (휴면)</span>
        </span>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">메모</span>
        <textarea
          name="memo"
          rows={2}
          defaultValue={initial.memo ?? ""}
          className="rounded-xl border border-edge p-3 text-[15px] leading-[1.45] outline-none focus:border-accent"
        />
      </label>
    </div>
  );

  const tierControl = (
    <div className="flex items-center justify-between gap-2">
      <span className="text-base">{isNew ? "티어" : "변경할 티어"}</span>
      <input type="hidden" name="tier" value={tier === null ? "" : String(tier)} />
      <div className="flex items-center gap-1 rounded-full bg-background p-[3px]">
        <button
          type="button"
          onClick={() => step(-1)}
          aria-label="티어 숫자 줄이기 (승급)"
          className="size-10 rounded-full bg-surface text-xl"
        >
          −
        </button>
        <span className="min-w-[84px] text-center text-[17px] font-bold" aria-live="polite">
          {tierChanged ? `${initial.tier ?? "미정"} → ${tierText(tier)}` : tierText(tier)}
        </span>
        <button
          type="button"
          onClick={() => step(1)}
          aria-label="티어 숫자 늘리기 (강등)"
          className="size-10 rounded-full bg-surface text-xl"
        >
          +
        </button>
      </div>
    </div>
  );

  return (
    <form action={formAction} className="flex flex-col">
      {!isNew && (
        <>
          <GroupLabel className="px-6 pt-5 pb-2">회원 정보</GroupLabel>
          <div className="mx-5">{info}</div>
        </>
      )}

      <GroupLabel className="px-6 pt-5 pb-2">{isNew ? "새 회원" : "결정"}</GroupLabel>
      <div className="mx-5 flex flex-col gap-3.5 rounded-2xl bg-surface p-4">
        {isNew && info}
        {tierControl}
        {tier !== null && (
          <button type="button" onClick={() => setTier(null)} className="self-end text-[13px] text-link">
            미정으로 두기
          </button>
        )}

        {suggestion && tier !== suggestion.tier && (
          <button
            type="button"
            onClick={applySuggestion}
            className="flex h-11 items-center justify-center rounded-xl bg-accent-soft text-[15px] font-semibold text-accent"
          >
            후보 반영: {suggestion.tier}티어로 바꾸고 근거 채우기
          </button>
        )}

        {tierChanged && (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold">
              사유 <span className="font-normal text-muted">필수 · 회원 이력에 남아요</span>
            </span>
            <textarea
              name="reason"
              required
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="예: 최근 폼이 3티어 평균에 근접. 다만 3티어 상대 전적이 약해 한 달 뒤 재검토."
              className="rounded-xl border border-edge p-3 text-[15px] leading-[1.45] outline-none focus:border-accent"
            />
            <span className="text-xs text-muted">
              숫자 근거 뒤에 운영진 판단(누구와 상의했는지 등)을 덧붙여 주세요.
            </span>
          </label>
        )}

        {state.error && <p className="text-sm text-danger">{state.error}</p>}

        {tierChanged ? (
          <div className="grid grid-cols-[1fr_2fr] gap-2.5">
            <button
              type="button"
              onClick={hold}
              className="h-12 rounded-full border border-edge bg-surface text-[15px] text-foreground"
            >
              보류
            </button>
            <button disabled={pending} className={primaryButton}>
              {pending ? "저장 중…" : "승인하고 저장"}
            </button>
          </div>
        ) : (
          <button disabled={pending} className={primaryButton}>
            {pending ? "저장 중…" : isNew ? "회원 추가" : "저장"}
          </button>
        )}
      </div>
    </form>
  );
}
