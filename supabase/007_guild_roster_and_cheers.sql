-- 길드원 목록(닉네임/직업/레벨만 공개) + 응원 보내기 기록
-- Supabase 대시보드 > SQL Editor 에서 이 파일 내용을 그대로 실행하세요.

-- characters 표는 본인 것만 보이게 막혀 있으므로, 닉네임/직업/레벨만 뽑아서 보여주는
-- 별도의 "창(view)"을 하나 만든다. 골드/장비/비밀번호 같은 건 여기 안 보인다.
create or replace view public.guild_roster as
select user_id, nickname, job, level from public.characters;

grant select on public.guild_roster to authenticated;

create table if not exists public.cheers (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  sender_nickname text not null,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  seen boolean not null default false
);

alter table public.cheers enable row level security;

create policy "cheers_select_own_sent" on public.cheers
  for select using (auth.uid() = sender_id);

create policy "cheers_select_own_received" on public.cheers
  for select using (auth.uid() = receiver_id);

create policy "cheers_insert_own" on public.cheers
  for insert with check (auth.uid() = sender_id);

create policy "cheers_update_received" on public.cheers
  for update using (auth.uid() = receiver_id);
