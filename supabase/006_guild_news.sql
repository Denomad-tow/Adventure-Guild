-- 길드 소식 피드 + 이모지 리액션
-- Supabase 대시보드 > SQL Editor 에서 이 파일 내용을 그대로 실행하세요.

create table if not exists public.guild_news (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nickname text not null,
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.guild_news enable row level security;

-- 길드 소식은 로그인한 사람이면 누구나 볼 수 있다 (자기 것만 보이던 characters 표와는 다르다).
create policy "guild_news_select_all" on public.guild_news
  for select using (auth.role() = 'authenticated');

create policy "guild_news_insert_own" on public.guild_news
  for insert with check (auth.uid() = user_id);

create table if not exists public.guild_news_reactions (
  id uuid primary key default gen_random_uuid(),
  news_id uuid not null references public.guild_news(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (news_id, user_id)
);

alter table public.guild_news_reactions enable row level security;

create policy "guild_news_reactions_select_all" on public.guild_news_reactions
  for select using (auth.role() = 'authenticated');

create policy "guild_news_reactions_insert_own" on public.guild_news_reactions
  for insert with check (auth.uid() = user_id);

create policy "guild_news_reactions_update_own" on public.guild_news_reactions
  for update using (auth.uid() = user_id);

create policy "guild_news_reactions_delete_own" on public.guild_news_reactions
  for delete using (auth.uid() = user_id);

-- 자동 규칙(트리거): 누가 내 소식에 리액션을 남기면, 그 글을 쓴 사람에게 골드를 조금 준다.
-- (반응을 남긴 사람이 아니라 "글쓴이" 계정을 서버가 직접 찾아서 지급해야 하므로,
--  일반 RLS 권한으로는 안 되고 이런 자동 규칙이 필요하다)
create or replace function public.handle_new_guild_news_reaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  poster_id uuid;
begin
  select user_id into poster_id from public.guild_news where id = new.news_id;
  if poster_id is not null then
    update public.characters
    set progress = jsonb_set(
      coalesce(progress, '{}'::jsonb),
      '{gold}',
      to_jsonb(coalesce((progress->>'gold')::numeric, 0) + 10)
    )
    where user_id = poster_id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_guild_news_reaction_created on public.guild_news_reactions;
create trigger on_guild_news_reaction_created
  after insert on public.guild_news_reactions
  for each row execute function public.handle_new_guild_news_reaction();
