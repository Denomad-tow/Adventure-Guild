-- 길드 채팅: 길드원 전체가 보는 채팅방 하나. 실시간으로 새 메시지가 도착한다.
-- Supabase 대시보드 > SQL Editor 에서 이 파일 내용을 그대로 실행하세요.

create table if not exists public.guild_chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nickname text not null,
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.guild_chat_messages enable row level security;

create policy "guild_chat_messages_select_all" on public.guild_chat_messages
  for select using (auth.role() = 'authenticated');

create policy "guild_chat_messages_insert_own" on public.guild_chat_messages
  for insert with check (auth.uid() = user_id);
