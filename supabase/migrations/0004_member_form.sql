-- 회원별 최근 N게임(settings.recent_n) 에버.
-- 순서: 정모 날짜 → 게임 번호 → (엑셀 기록은 날짜가 없어 가장 오래된 것으로, 그 안에서는 seq)
create view public.member_form
with (security_invoker = true) as
with ordered as (
  select
    s.member_id,
    s.score,
    row_number() over (
      partition by s.member_id
      order by coalesce(se.date, date '1900-01-01') desc, coalesce(g.game_no, 0) desc, s.seq desc nulls last, s.created_at desc
    ) as rn
  from public.scores s
  left join public.games g on g.id = s.game_id
  left join public.sessions se on se.id = g.session_id
)
select
  o.member_id,
  count(*)::int as recent_games,
  avg(o.score)::float8 as recent_avg
from ordered o
join public.settings st on st.id = 1
where o.rn <= st.recent_n
group by o.member_id;
