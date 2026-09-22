-- 길드 랭킹에 칭호를 같이 보여주기 위해 guild_roster 뷰에 칭호 컬럼을 추가한다.
-- Supabase 대시보드 > SQL Editor 에서 이 파일 내용을 그대로 실행하세요.

create or replace view public.guild_roster as
select
  user_id,
  nickname,
  job,
  level,
  coalesce((progress->>'unlockedRegionIndex')::int, 0) as unlocked_region_index,
  coalesce((progress->>'guildContribution')::numeric, 0) as guild_contribution,
  progress->>'equippedTitle' as equipped_title
from public.characters;
