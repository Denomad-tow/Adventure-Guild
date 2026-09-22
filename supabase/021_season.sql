-- 시즌(약 4주): 시즌이 끝나면 순위별 칭호를 나눠주고 새 시즌을 시작한다.
-- 별도의 예약 작업(cron) 없이, 아무나 길드 탭에 접속했을 때 "시즌이 끝났는지" 확인해서
-- 끝났으면 그 순간 자동으로 정산하는 방식이다.
-- Supabase 대시보드 > SQL Editor 에서 이 파일 내용을 그대로 실행하세요.

create table if not exists public.season_state (
  id int primary key default 1,
  season_number int not null default 1,
  started_at timestamptz not null default now(),
  ends_at timestamptz not null default (now() + interval '28 days')
);

insert into public.season_state (id) values (1)
on conflict (id) do nothing;

alter table public.season_state enable row level security;

create policy "season_state_select_all" on public.season_state
  for select using (auth.role() = 'authenticated');

create or replace function public.advance_season_if_ended()
returns table(result_season_number int, result_started_at timestamptz, result_ends_at timestamptz, just_ended boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_season_number int;
  v_started_at timestamptz;
  v_ends_at timestamptz;
  v_just_ended boolean := false;
  v_char record;
  v_rank int := 0;
  v_title text;
begin
  select season_number, started_at, ends_at into v_season_number, v_started_at, v_ends_at
  from public.season_state where id = 1
  for update;

  if now() >= v_ends_at then
    v_just_ended := true;

    -- 종합 점수: 도달 지역 × 1000 + 업적 개수 × 100 + 이번 시즌 월드보스 누적 피해/10000
    for v_char in
      select
        c.user_id,
        coalesce((c.progress->>'unlockedRegionIndex')::int, 0) * 1000
          + coalesce(jsonb_array_length(c.progress->'achievements'), 0) * 100
          + coalesce((
              select sum(w.damage) from public.world_boss_challenges w
              where w.user_id = c.user_id and w.created_at >= v_started_at
            ), 0) / 10000 as score
      from public.characters c
      order by score desc
    loop
      v_rank := v_rank + 1;

      if v_rank = 1 then
        v_title := format('%s시즌 챔피언', v_season_number);
      elsif v_rank <= 3 then
        v_title := format('%s시즌 TOP3', v_season_number);
      else
        v_title := format('%s시즌 참가자', v_season_number);
      end if;

      update public.characters
      set progress = jsonb_set(
        coalesce(progress, '{}'::jsonb),
        '{unlockedTitles}',
        coalesce(progress->'unlockedTitles', '[]'::jsonb) || to_jsonb(array[v_title])
      )
      where user_id = v_char.user_id;
    end loop;

    update public.season_state
    set season_number = v_season_number + 1,
        started_at = now(),
        ends_at = now() + interval '28 days'
    where id = 1;

    select season_number, started_at, ends_at into v_season_number, v_started_at, v_ends_at
    from public.season_state where id = 1;
  end if;

  return query select v_season_number, v_started_at, v_ends_at, v_just_ended;
end;
$$;

grant execute on function public.advance_season_if_ended() to authenticated;
