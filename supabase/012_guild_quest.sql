-- 길드 공동 주간 퀘스트: 길드원 전체가 합쳐서 몬스터를 얼마나 잡았는지 세는 공유 카운터.
-- Supabase 대시보드 > SQL Editor 에서 이 파일 내용을 그대로 실행하세요.

create table if not exists public.guild_quest_progress (
  id int primary key default 1,
  week_key text not null,
  kill_count bigint not null default 0
);

insert into public.guild_quest_progress (id, week_key, kill_count)
values (1, to_char(now(), 'IYYY-"W"IW'), 0)
on conflict (id) do nothing;

alter table public.guild_quest_progress enable row level security;

create policy "guild_quest_progress_select_all" on public.guild_quest_progress
  for select using (auth.role() = 'authenticated');

-- 누군가 몬스터를 잡을 때마다 이 함수로 길드 전체 카운터에 더한다.
-- 주(week_key)가 바뀌었으면 새 주 값으로 초기화하고서 더해준다.
create or replace function public.add_guild_quest_kills(p_amount bigint, p_week_key text)
returns table(kill_count bigint, week_key text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_week_key text;
begin
  select gq.week_key into v_week_key from public.guild_quest_progress gq where id = 1 for update;

  if v_week_key is distinct from p_week_key then
    update public.guild_quest_progress set week_key = p_week_key, kill_count = greatest(p_amount, 0) where id = 1;
  else
    update public.guild_quest_progress set kill_count = kill_count + p_amount where id = 1;
  end if;

  return query select gq.kill_count, gq.week_key from public.guild_quest_progress gq where id = 1;
end;
$$;

grant execute on function public.add_guild_quest_kills(bigint, text) to authenticated;
