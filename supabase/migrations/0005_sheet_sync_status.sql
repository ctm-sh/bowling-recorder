-- 구글 시트 내보내기 상태 (설정 화면에 표시)
alter table public.settings add column last_synced_at timestamptz;
alter table public.settings add column last_sync_error text;
