-- 032에서 난이도(쉬움/보통/어려움)를 분리했는데, "쉬움"은 그동안 테스트로 진행도(lord_index)가 이미 쌓여 있고
-- "보통"/"어려움"은 방금 새로 만들어져 0부터 시작이라, 쉬움 체력이 오히려 더 커 보이는 문제가 있었다.
-- 서비스 오픈 전이라 3개 난이도 진행도를 전부 처음 상태로 되돌린다.
-- Supabase 대시보드 > SQL Editor 에서 이 파일 내용을 그대로 실행하세요.

update public.world_boss_state
set lord_index = 0,
    max_hp = case tier when 'hard' then 3000000 when 'normal' then 1250000 else 500000 end,
    current_hp = case tier when 'hard' then 3000000 when 'normal' then 1250000 else 500000 end,
    phase = 0,
    phase_event_until = null,
    updated_at = now();
