"use client";

import { useActionState, useState } from "react";
import type { MemberFormState } from "./actions";

type Initial = { name: string; tier: number | null; active: boolean; memo: string | null };

const TIERS = Array.from({ length: 15 }, (_, i) => i);

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
  const [tier, setTier] = useState(initial.tier === null ? "" : String(initial.tier));
  const [reason, setReason] = useState("");
  const tierChanged = !isNew && tier !== (initial.tier === null ? "" : String(initial.tier));

  function applySuggestion() {
    if (!suggestion) return;
    setTier(String(suggestion.tier));
    setReason(suggestion.reason + "\n");
  }

  return (
    <form action={formAction} className="flex flex-col gap-4 p-4">
      <label className="flex flex-col gap-1 text-sm font-bold">
        이름
        <input
          name="name"
          required
          maxLength={20}
          defaultValue={initial.name}
          className="h-12 rounded-xl border-2 border-line px-3 text-base font-normal outline-none focus:border-brand"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-bold">
        티어
        <select
          name="tier"
          value={tier}
          onChange={(e) => setTier(e.target.value)}
          className="h-12 rounded-xl border-2 border-line bg-surface px-3 text-base font-normal outline-none focus:border-brand"
        >
          <option value="">미정</option>
          {TIERS.map((t) => (
            <option key={t} value={t}>
              {t}티어
            </option>
          ))}
        </select>
      </label>

      {suggestion && tier !== String(suggestion.tier) && (
        <button
          type="button"
          onClick={applySuggestion}
          className="h-11 rounded-xl border-2 border-dashed border-brand text-sm font-bold text-brand"
        >
          후보 반영: {suggestion.tier}티어로 바꾸고 근거 채우기
        </button>
      )}

      {tierChanged && (
        <label className="flex flex-col gap-1 text-sm font-bold">
          티어 변경 사유 (필수)
          <textarea
            name="reason"
            required
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="예: 최근 20게임 에버 +15, 2티어 상대 전적 대등, 운영진 3인 동의"
            className="rounded-xl border-2 border-line p-3 text-base font-normal outline-none focus:border-brand"
          />
          <span className="text-xs font-normal text-muted">숫자 근거 뒤에 운영진 판단(누구와 상의했는지 등)을 덧붙여 주세요.</span>
        </label>
      )}

      <label className="flex items-center gap-3 text-sm font-bold">
        <input type="checkbox" name="active" defaultChecked={initial.active} className="size-5 accent-brand" />
        활동 중 (끄면 참석 체크 목록에서 숨겨요)
      </label>

      <label className="flex flex-col gap-1 text-sm font-bold">
        메모
        <textarea
          name="memo"
          rows={2}
          defaultValue={initial.memo ?? ""}
          className="rounded-xl border-2 border-line p-3 text-base font-normal outline-none focus:border-brand"
        />
      </label>

      {state.error && <p className="text-sm text-danger">{state.error}</p>}

      <button
        disabled={pending}
        className="h-14 rounded-xl bg-brand text-base font-bold text-white disabled:opacity-60"
      >
        {pending ? "저장 중…" : isNew ? "회원 추가" : "저장"}
      </button>
    </form>
  );
}
