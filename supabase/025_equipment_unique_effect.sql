-- 전설/신화 장비 고유 효과를 저장할 컬럼 추가.
-- Supabase 대시보드 > SQL Editor 에서 이 파일 내용을 그대로 실행하세요.

alter table public.equipment add column if not exists unique_effect text;
