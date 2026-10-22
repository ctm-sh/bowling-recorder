import { ActionButton } from "@/components/ActionButton";
import { PageHeader } from "@/components/PageHeader";
import { getSettings } from "@/lib/db/settings";
import { googleConfigured, serviceAccountEmail } from "@/lib/sheets/google";
import { syncNow } from "./actions";
import { SettingsForm } from "./SettingsForm";

export default async function AdminSettingsPage() {
  const settings = await getSettings();
  const connected = googleConfigured();
  const email = serviceAccountEmail();
  const sheetUrl = settings.sheet_id ? `https://docs.google.com/spreadsheets/d/${settings.sheet_id}/edit` : "";

  return (
    <div className="pb-6">
      <PageHeader title="설정" back="/admin" />
      <SettingsForm
        table={settings.handicap_table}
        fee={settings.default_fee}
        recentN={settings.recent_n}
        sheetUrl={sheetUrl}
      />

      <section className="mx-4 rounded-2xl border border-line p-4">
        <h2 className="text-sm font-bold">구글 시트 내보내기</h2>
        <p className="mt-1 text-xs text-muted">
          정모를 마감하면 자동으로 `점수기록지` 탭을 새로 써요. 시트의 다른 탭은 건드리지 않아요.
        </p>

        <dl className="mt-3 grid grid-cols-[5rem_1fr] gap-y-1 text-sm">
          <dt className="text-muted">서비스 계정</dt>
          <dd className="break-all">{connected ? email : <span className="text-danger">연결 안 됨</span>}</dd>
          <dt className="text-muted">시트</dt>
          <dd>
            {settings.sheet_id ? (
              <a href={sheetUrl} target="_blank" rel="noreferrer" className="text-brand underline">
                시트 열기
              </a>
            ) : (
              <span className="text-muted">미설정</span>
            )}
          </dd>
          <dt className="text-muted">마지막 성공</dt>
          <dd>{settings.last_synced_at ? new Date(settings.last_synced_at).toLocaleString("ko-KR") : "—"}</dd>
        </dl>
        {settings.last_sync_error && (
          <p className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-danger">마지막 오류: {settings.last_sync_error}</p>
        )}

        {connected && settings.sheet_id ? (
          <div className="mt-3">
            <ActionButton action={syncNow} className="h-12 w-full rounded-xl bg-brand-soft font-bold text-brand">
              ↻ 지금 내보내기
            </ActionButton>
          </div>
        ) : (
          <details className="mt-3 rounded-xl bg-background p-3 text-sm" open={!connected}>
            <summary className="cursor-pointer font-bold">연결 방법 (처음 한 번)</summary>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs leading-relaxed">
              {!connected && (
                <>
                  <li>console.cloud.google.com에서 프로젝트를 만들고 &quot;Google Sheets API&quot;를 사용 설정해요.</li>
                  <li>IAM → 서비스 계정 만들기 → 키 → JSON 키를 내려받아요.</li>
                  <li>
                    JSON의 <code>client_email</code>을 <code>GOOGLE_SERVICE_ACCOUNT_EMAIL</code>에,{" "}
                    <code>private_key</code>를 <code>GOOGLE_PRIVATE_KEY</code>에 넣어요 (.env.local / 배포 환경 변수).
                  </li>
                  <li>서버를 다시 시작해요.</li>
                </>
              )}
              <li>내보낼 구글 시트를 서비스 계정 이메일에 &quot;편집자&quot;로 공유해요.</li>
              <li>위 설정에 시트 주소를 붙여넣고 저장해요.</li>
            </ol>
          </details>
        )}
      </section>
    </div>
  );
}
