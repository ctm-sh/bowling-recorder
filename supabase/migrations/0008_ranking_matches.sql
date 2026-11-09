-- 랭킹전·마스터즈 (docs/04-ranking-match.md). 정산·승률에 섞이지 않도록 정모 테이블과 분리한다.

create table public.ranking_matches (
  id uuid primary key default gen_random_uuid(),
  match_no smallint not null unique check (match_no > 0),
  date date not null,
  -- 참가자·구성을 저장하기 전에는 null
  format text check (format in ('team', 'target')),
  -- 점수 넘기기 구간: [{ "minTotal": 1800, "prize": 50000 }, ...]
  target_tiers jsonb not null default '[]'::jsonb,
  team_prize integer not null default 100000 check (team_prize >= 0),
  masters_prize integer not null default 30000 check (masters_prize >= 0),
  masters_size smallint check (masters_size > 0),
  prize_representative_id uuid references public.members(id) on delete set null,
  masters_winner_id uuid references public.members(id) on delete set null,
  closed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.ranking_teams (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.ranking_matches(id) on delete cascade,
  team_no smallint not null,
  -- 인원이 적은 팀에 게임마다 더하는 꼭두각시 점수. *_default는 다르면 "합의 조정" 표시용
  fill_score integer,
  fill_score_default integer,
  unique (match_id, team_no)
);

create table public.ranking_entries (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.ranking_matches(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  -- 점수 넘기기는 null
  team_id uuid references public.ranking_teams(id) on delete set null,
  tier_snapshot smallint not null,
  -- handicap_snapshot: 실제 적용값, handicap_default: 핸디표 기본값 (다르면 "합의 조정")
  handicap_snapshot integer not null check (handicap_snapshot between 0 and 300),
  handicap_default integer not null,
  -- 마스터즈 진출 순번. 진출하지 않으면 null
  masters_seed smallint,
  unique (match_id, member_id)
);
create index ranking_entries_member_id_idx on public.ranking_entries (member_id);

create table public.ranking_scores (
  entry_id uuid not null references public.ranking_entries(id) on delete cascade,
  game_no smallint not null check (game_no between 1 and 3),
  score smallint not null check (score between 0 and 300),
  created_at timestamptz not null default now(),
  primary key (entry_id, game_no)
);

-- 단판이고 회원 에버·최근 폼에는 넣지 않는다
create table public.masters_scores (
  entry_id uuid primary key references public.ranking_entries(id) on delete cascade,
  score smallint not null check (score between 0 and 300),
  created_at timestamptz not null default now()
);

-- 기존 테이블과 같이 RLS를 켜고 정책은 두지 않는다 (서버의 secret 키로만 접근)
alter table public.ranking_matches enable row level security;
alter table public.ranking_teams enable row level security;
alter table public.ranking_entries enable row level security;
alter table public.ranking_scores enable row level security;
alter table public.masters_scores enable row level security;

-- 전체 에버·최근 폼에 랭킹전 3게임을 포함한다 (승률·상대 전적은 정모 테이블에서만 계산)
create or replace view public.member_stats
with (security_invoker = true) as
with all_scores as (
  select s.member_id, s.score from public.scores s
  union all
  select e.member_id, r.score
  from public.ranking_scores r
  join public.ranking_entries e on e.id = r.entry_id
)
select
  m.id as member_id,
  count(a.score)::int as games,
  avg(a.score)::float8 as avg
from public.members m
left join all_scores a on a.member_id = m.id
group by m.id;

create or replace view public.member_form
with (security_invoker = true) as
with all_scores as (
  select
    s.member_id,
    s.score,
    coalesce(se.date, date '1900-01-01') as played_on,
    coalesce(g.game_no, 0) as game_no,
    s.seq,
    s.created_at
  from public.scores s
  left join public.games g on g.id = s.game_id
  left join public.sessions se on se.id = g.session_id
  union all
  select e.member_id, r.score, rm.date, r.game_no, null, r.created_at
  from public.ranking_scores r
  join public.ranking_entries e on e.id = r.entry_id
  join public.ranking_matches rm on rm.id = e.match_id
),
ordered as (
  select
    a.member_id,
    a.score,
    row_number() over (
      partition by a.member_id
      order by a.played_on desc, a.game_no desc, a.seq desc nulls last, a.created_at desc
    ) as rn
  from all_scores a
)
select
  o.member_id,
  count(*)::int as recent_games,
  avg(o.score)::float8 as recent_avg
from ordered o
join public.settings st on st.id = 1
where o.rn <= st.recent_n
group by o.member_id;
