-- 팀 구성 때 개인 핸디도 합의로 바꿀 수 있다.
-- handicap_snapshot: 실제 적용한 개인 핸디, handicap_default: 핸디표 기준 기본값 (다르면 "합의 조정")
alter table team_members add column handicap_default integer;
update team_members set handicap_default = handicap_snapshot;
alter table team_members alter column handicap_default set not null;
alter table team_members alter column handicap_default set default 0;
