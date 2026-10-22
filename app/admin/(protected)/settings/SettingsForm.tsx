"use client";

import { useActionState } from "react";
import { GroupLabel, primaryButton } from "@/components/ui";
import { saveSettings } from "./actions";

const TIERS = Array.from({ length: 15 }, (_, i) => i);

export function SettingsForm({
  table,
  fee,
  recentN,
  sheetUrl,
}: {
  table: Record<string, number>;
  fee: number;
  recentN: number;
  sheetUrl: string;
}) {
  const [state, action, pending] = useActionState(saveSettings, {});

  return (
    <form action={action} className="flex flex-col">
      <div className="flex items-baseline justify-between px-6 pt-5 pb-2">
        <span className="text-[13px] font-semibold text-muted">티어별 핸디표</span>
        <span className="text-xs text-muted">상대끼리 차이만큼 받아요</span>
      </div>
      <div className="mx-5 grid grid-cols-5 gap-1.5 rounded-2xl bg-surface p-3">
        {TIERS.map((t) => (
          <label key={t} className="flex flex-col items-center gap-0.5 rounded-[10px] bg-background py-1.5">
            <span className="text-[11px] text-muted">{t}티어</span>
            <input
              name={`h${t}`}
              type="number"
              inputMode="numeric"
              min={0}
              max={300}
              required
              defaultValue={table[String(t)] ?? 0}
              className="min-h-7 w-full bg-transparent text-center text-[17px] font-bold outline-none focus:text-accent"
            />
          </label>
        ))}
      </div>
      <p className="px-6 pt-2 text-xs text-muted">바꾸면 다음에 만드는 게임부터 적용돼요.</p>

      <GroupLabel className="px-6 pt-5 pb-2">정모 기본값</GroupLabel>
      <div className="mx-5 overflow-hidden rounded-2xl bg-surface">
        <div className="flex min-h-[52px] items-center border-b border-separator px-4">
          <label htmlFor="set-fee" className="flex-1 text-base">
            게임비 <span className="text-[13px] text-muted">1인 1게임</span>
          </label>
          <input
            id="set-fee"
            name="fee"
            type="number"
            inputMode="numeric"
            min={0}
            step={100}
            required
            defaultValue={fee}
            className="w-24 bg-transparent text-right text-base text-accent outline-none"
          />
          <span className="pl-0.5 text-base text-accent">원</span>
        </div>
        <div className="flex min-h-[52px] items-center border-b border-separator px-4">
          <label htmlFor="set-form" className="flex flex-1 flex-col">
            <span className="text-base">최근 폼 기준</span>
            <span className="text-xs text-muted">최근 에버·승급/강등 후보 계산</span>
          </label>
          <input
            id="set-form"
            name="recent_n"
            type="number"
            inputMode="numeric"
            min={5}
            max={200}
            required
            defaultValue={recentN}
            className="w-16 bg-transparent text-right text-base text-accent outline-none"
          />
          <span className="pl-0.5 text-base text-accent">게임</span>
        </div>
        <div className="flex min-h-[52px] items-center px-4">
          <span className="flex-1 text-base">정산 반올림</span>
          <span className="text-base text-muted">100원 단위 올림</span>
        </div>
      </div>

      <GroupLabel className="px-6 pt-5 pb-2">구글 시트</GroupLabel>
      <div className="mx-5 flex flex-col gap-1.5 rounded-2xl bg-surface p-4">
        <label htmlFor="set-sheet" className="text-base">
          내보낼 시트 주소
        </label>
        <input
          id="set-sheet"
          name="sheet"
          type="url"
          defaultValue={sheetUrl}
          placeholder="https://docs.google.com/spreadsheets/d/…"
          className="h-11 rounded-xl border border-edge px-3 text-[15px] outline-none focus:border-accent"
        />
        <span className="text-xs text-muted">시트 주소창의 URL을 그대로 붙여넣으세요. 비워두면 내보내지 않아요.</span>
      </div>

      <div className="flex flex-col gap-2 px-5 pt-4">
        {state.error && <p className="text-center text-sm text-danger">{state.error}</p>}
        {state.saved && !state.error && <p className="text-center text-sm text-accent">저장했어요.</p>}
        <button disabled={pending} className={primaryButton}>
          {pending ? "저장 중…" : "설정 저장"}
        </button>
      </div>
    </form>
  );
}
