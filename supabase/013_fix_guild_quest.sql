-- add_guild_quest_kills 함수 수정: 반환 컬럼 이름이 테이블 컬럼 이름(kill_count)과 겹쳐서
-- "어떤 kill_count를 말하는거야?" 하고 DB가 헷갈려하던 문제(ambiguous column)를 고친다.
-- Supabase 대시보드 > SQL Editor 에서 이 파일 내용을 그대로 실행하세요.

drop function if exists public.add_guild_quest_kills(bigint, text);

create or replace function public.add_guild_quest_kills(p_amount bigint, p_week_key text)
returns table(result_kill_count bigint, result_week_key text)
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
