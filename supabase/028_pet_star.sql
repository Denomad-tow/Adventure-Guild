-- 펫 별 등급: 같은 종류의 다른 펫을 재료로 먹여서 올린다.
-- Supabase 대시보드 > SQL Editor 에서 이 파일 내용을 그대로 실행하세요.

alter table public.pets add column if not exists star int not null default 1;
