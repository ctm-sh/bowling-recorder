"use client";

import { useActionState } from "react";
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
    <form action={action} className="flex flex-col gap-6 p-4">
      <section>
        <h2 className="text-sm font-bold">티어별 핸디표</h2>
        <p className="mt-1 text-xs text-muted">
          상대방끼리 이 값의 차이만큼 낮은 티어가 받아요. 바꾸면 <b>다음에 만드는 게임부터</b> 적용돼요.
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {TIERS.map((t) => (
            <label key={t} className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm">
              <span className="w-10 font-bold">{t}티어</span>
              <input
                name={`h${t}`}
                type="number"
                inputMode="numeric"
                min={0}
                max={300}
                required
                defaultValue={table[String(t)] ?? 0}
                className="h-9 min-w-0 flex-1 rounded-lg border-2 border-line text-center font-bold outline-none focus:border-brand"
              />
            </label>
          ))}
        </div>
      </section>

      <label className="flex flex-col gap-1 text-sm font-bold">
        기본 게임비 (1인 1게임, 원)
        <span className="text-xs font-normal text-muted">새 정모를 만들 때 채워지는 값이에요. 정모마다 바꿀 수 있어요.</span>
        <input
          name="fee"
          type="number"
          inputMode="numeric"
          min={0}
          step={100}
          required
          defaultValue={fee}
          className="h-12 rounded-xl border-2 border-line px-3 text-base font-normal outline-none focus:border-brand"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-bold">
        최근 폼 기준 게임 수
        <span className="text-xs font-normal text-muted">최근 에버·승급/강등 후보 계산에 써요.</span>
        <input
          name="recent_n"
          type="number"
          inputMode="numeric"
          min={5}
          max={200}
          required
          defaultValue={recentN}
          className="h-12 rounded-xl border-2 border-line px-3 text-base font-normal outline-none focus:border-brand"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-bold">
        내보낼 구글 시트 주소
        <span className="text-xs font-normal text-muted">
          시트 주소창의 URL을 그대로 붙여넣으세요. 비워두면 내보내지 않아요.
        </span>
        <input
          name="sheet"
          type="url"
          defaultValue={sheetUrl}
          placeholder="https://docs.google.com/spreadsheets/d/…"
          className="h-12 rounded-xl border-2 border-line px-3 text-sm font-normal outline-none focus:border-brand"
        />
      </label>

      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      {state.saved && !state.error && <p className="text-sm font-bold text-green-700">✓ 저장했어요.</p>}
      <button disabled={pending} className="h-14 rounded-xl bg-brand text-base font-bold text-white disabled:opacity-60">
        {pending ? "저장 중…" : "설정 저장"}
      </button>
    </form>
  );
}
