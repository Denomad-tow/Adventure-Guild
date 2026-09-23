-- 길드 채팅이 실시간으로 오지 않고 탭을 오가야만 보이던 문제 수정.
-- 테이블과 정책은 이미 있지만, "실시간 발행 목록"에 등록을 안 해서 새 메시지 이벤트가 전달되지 않고 있었다.
-- Supabase 대시보드 > SQL Editor 에서 이 파일 내용을 그대로 실행하세요.

alter publication supabase_realtime add table public.guild_chat_messages;
