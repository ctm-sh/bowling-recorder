import { ActionButton } from "@/components/ActionButton";
import { PageHeader } from "@/components/PageHeader";
import { GroupLabel } from "@/components/ui";
import { getSettings } from "@/lib/db/settings";
import { googleConfigured, serviceAccountEmail } from "@/lib/sheets/google";
import { logout } from "../../actions";
import { syncNow } from "./actions";
import { SettingsForm } from "./SettingsForm";

export default async function AdminSettingsPage() {
  const settings = await getSettings();
  const connected = googleConfigured();
  const email = serviceAccountEmail();
  const sheetUrl = settings.sheet_id ? `https://docs.google.com/spreadsheets/d/${settings.sheet_id}/edit` : "";
  const ready = connected && !!settings.sheet_id;

  return (
    <div className="pb-6">
      <PageHeader title="설정" />
      <SettingsForm
        table={settings.handicap_table}
        fee={settings.default_fee}
        recentN={settings.recent_n}
        sheetUrl={sheetUrl}
      />

      <GroupLabel className="px-6 pt-6 pb-2">데이터</GroupLabel>
      <div className="mx-5 overflow-hidden rounded-2xl bg-surface">
        <div className="flex min-h-[60px] items-center gap-3 border-b border-separator px-4 py-2">
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-base">구글 시트 내보내기</span>
            <span className="text-xs text-muted">점수기록지 탭 · 정모 마감 때 자동 반영</span>
          </span>
          <span
            className={`text-[13px] font-semibold ${ready && !settings.last_sync_error ? "text-accent" : "text-muted"}`}
          >
            {!connected
              ? "연결 안 됨"
              : !settings.sheet_id
                ? "시트 미설정"
                : settings.last_sync_error
                  ? "오류"
                  : "연결됨"}
          </span>
        </div>
        <dl className="grid grid-cols-[6rem_1fr] gap-y-1.5 border-b border-separator px-4 py-3 text-sm">
          <dt className="text-muted">서비스 계정</dt>
          <dd className="break-all">{connected ? email : "—"}</dd>
          <dt className="text-muted">시트</dt>
          <dd>
            {settings.sheet_id ? (
              <a href={sheetUrl} target="_blank" rel="noreferrer" className="text-link">
                시트 열기
              </a>
            ) : (
              <span className="text-muted">미설정</span>
            )}
          </dd>
          <dt className="text-muted">마지막 반영</dt>
          <dd>
            {settings.last_synced_at
              ? new Date(settings.last_synced_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })
              : "—"}
          </dd>
        </dl>
        {settings.last_sync_error && (
          <p className="border-b border-separator px-4 py-3 text-[13px] text-danger">
            마지막 오류: {settings.last_sync_error}
          </p>
        )}
        {ready ? (
          <ActionButton action={syncNow} className="flex min-h-[52px] w-full items-center px-4 text-base text-link">
            지금 내보내기
          </ActionButton>
        ) : (
          <details className="px-4 py-3 text-sm" open={!connected}>
            <summary className="flex min-h-8 cursor-pointer items-center text-link">연결 방법 (처음 한 번)</summary>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs leading-relaxed text-muted">
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
        {/* TODO(디자인): 시안의 "기존 엑셀 가져오기"는 앱 기능이 아니라 scripts/import-xlsx.mjs 스크립트라 넣지 않았다 */}
      </div>

      <GroupLabel className="px-6 pt-6 pb-2">접근</GroupLabel>
      <div className="mx-5 overflow-hidden rounded-2xl bg-surface">
        {/* TODO(디자인): 시안의 "회원용 공유 링크 복사", "운영진 비밀번호 변경"은 아직 없는 기능이라 넣지 않았다 */}
        <form action={logout}>
          <button className="flex min-h-[52px] w-full items-center px-4 text-base text-link">운영진 로그아웃</button>
        </form>
      </div>
    </div>
  );
}
