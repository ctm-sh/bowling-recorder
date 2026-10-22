-- 볼링 동호회 기록 서비스 초기 스키마
-- 모든 테이블은 RLS를 켜고 정책을 두지 않는다: 브라우저(anon)에서는 접근 불가, 서버의 secret 키로만 접근한다.

create table public.members (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  tier smallint not null check (tier between 0 and 14),
  active boolean not null default true,
  memo text,
  created_at timestamptz not null default now()
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  fee_per_game integer not null default 2800 check (fee_per_game >= 0),
  closed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.attendees (
  session_id uuid not null references public.sessions(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  primary key (session_id, member_id)
);
create index attendees_member_id_idx on public.attendees (member_id);

create table public.games (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  game_no smallint not null,
  mode text not null default 'random' check (mode in ('random', 'manual')),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (session_id, game_no)
);

-- handicap / fill_score: 실제 적용값, *_default: 핸디표·에버 기준 기본값 (다르면 "합의 조정")
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  team_no smallint not null,
  handicap integer not null default 0,
  handicap_default integer not null default 0,
  fill_score integer,
  fill_score_default integer,
  unique (game_id, team_no)
);

-- group_no: 팀 배분 묶음 번호. 같은 게임에서 group_no가 같은 사람끼리 서로의 "상대방"이다.
create table public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  tier_snapshot smallint not null,
  handicap_snapshot integer not null,
  group_no smallint not null,
  primary key (team_id, member_id)
);
create index team_members_member_id_idx on public.team_members (member_id);

-- game_id가 null이면 기존 엑셀에서 가져온 기록 (날짜·팀 정보 없음, seq로 순서만 보존)
create table public.scores (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  game_id uuid references public.games(id) on delete cascade,
  score smallint not null check (score between 0 and 300),
  seq integer,
  created_at timestamptz not null default now(),
  unique (member_id, game_id)
);
create index scores_member_id_idx on public.scores (member_id);
create index scores_game_id_idx on public.scores (game_id);

create table public.tier_changes (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  from_tier smallint not null,
  to_tier smallint not null,
  reason text not null check (length(trim(reason)) > 0),
  created_at timestamptz not null default now()
);
create index tier_changes_member_id_idx on public.tier_changes (member_id);

create table public.settings (
  id smallint primary key default 1 check (id = 1),
  handicap_table jsonb not null,
  default_fee integer not null default 2800,
  recent_n smallint not null default 20,
  sheet_id text
);

alter table public.members enable row level security;
alter table public.sessions enable row level security;
alter table public.attendees enable row level security;
alter table public.games enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.scores enable row level security;
alter table public.tier_changes enable row level security;
alter table public.settings enable row level security;

-- 핸디표: 기존 엑셀 `핸디` 시트 (티어 → 개인 핸디)
insert into public.settings (id, handicap_table, default_fee, recent_n)
values (
  1,
  '{"0":0,"1":8,"2":12,"3":16,"4":20,"5":26,"6":32,"7":38,"8":46,"9":60,"10":65,"11":75,"12":85,"13":95,"14":100}'::jsonb,
  2800,
  20
);
