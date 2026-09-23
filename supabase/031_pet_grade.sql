-- 펫(알)에도 장비처럼 등급(일반~신화)이 생긴다. 등급이 높을수록 부화 시간이 길고 효과도 세다.
-- Supabase 대시보드 > SQL Editor 에서 이 파일 내용을 그대로 실행하세요.

alter table public.pets add column if not exists grade text not null default 'common';
