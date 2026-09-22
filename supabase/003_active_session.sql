-- 같은 계정으로 다른 곳에서 로그인하면, 이전 위치는 자동으로 로그아웃되게 하기 위한 표시용 컬럼
-- Supabase 대시보드 > SQL Editor 에서 이 파일 내용을 그대로 실행하세요.

alter table public.characters add column if not exists active_session_id uuid;

-- 이 컬럼 값이 바뀌는 걸 실시간으로 감지하려면 realtime 기능을 켜줘야 한다.
alter publication supabase_realtime add table public.characters;
