-- 무기 속성(자연/어둠/물/불/빛) 저장용 컬럼 추가
-- Supabase 대시보드 > SQL Editor 에서 이 파일 내용을 그대로 실행하세요.

alter table public.equipment add column if not exists element text;
