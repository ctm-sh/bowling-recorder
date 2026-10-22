-- 티어 미정 회원 허용 (null = 미정)
alter table public.members alter column tier drop not null;

-- 회원별 게임 수·전체 에버. security_invoker로 호출자 권한(RLS)을 따른다.
create view public.member_stats
with (security_invoker = true) as
select
  m.id as member_id,
  count(s.id)::int as games,
  avg(s.score)::float8 as avg
from public.members m
left join public.scores s on s.member_id = m.id
group by m.id;
