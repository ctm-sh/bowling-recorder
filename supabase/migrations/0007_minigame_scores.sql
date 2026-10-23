-- 회원 화면 볼링 미니게임 점수 (게임 랭킹용). 이 기기에서 고른 회원 이름으로 남긴다.
create table public.minigame_scores (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  score smallint not null check (score between 0 and 300),
  created_at timestamptz not null default now()
);
create index minigame_scores_member_id_idx on public.minigame_scores (member_id);

-- 다른 테이블처럼 브라우저에서는 막고 서버(secret 키)에서만 읽고 쓴다
alter table public.minigame_scores enable row level security;
