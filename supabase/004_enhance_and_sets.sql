-- 장비별 강화 단계와 세트 정보를 저장할 컬럼 추가
-- Supabase 대시보드 > SQL Editor 에서 이 파일 내용을 그대로 실행하세요.

alter table public.equipment add column if not exists enhance_level integer not null default 0;
alter table public.equipment add column if not exists set_id text;
