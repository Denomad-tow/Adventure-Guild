-- 길드 소식에 종류(카테고리)를 붙여서, 각자 원하는 종류만 골라 볼 수 있게 한다.
-- Supabase 대시보드 > SQL Editor 에서 이 파일 내용을 그대로 실행하세요.

alter table public.guild_news add column if not exists category text not null default 'general';
