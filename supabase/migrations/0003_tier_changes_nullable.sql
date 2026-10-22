-- 티어 미정(null)에서/으로 바뀌는 이력도 남길 수 있게
alter table public.tier_changes alter column from_tier drop not null;
alter table public.tier_changes alter column to_tier drop not null;
