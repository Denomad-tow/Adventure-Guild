-- 길드 랭킹에 쓸 정보(도달 지역, 길드 공헌도)를 guild_roster 뷰에 추가한다.
-- Supabase 대시보드 > SQL Editor 에서 이 파일 내용을 그대로 실행하세요.

create or replace view public.guild_roster as
select
  user_id,
  nickname,
  job,
  level,
  coalesce((progress->>'unlockedRegionIndex')::int, 0) as unlocked_region_index,
  coalesce((progress->>'guildContribution')::numeric, 0) as guild_contribution
from public.characters;
