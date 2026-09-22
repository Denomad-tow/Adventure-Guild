-- 월드 보스(일곱 균열의 군주): 길드 전체가 공유하는 체력바 + 도전 기록
-- Supabase 대시보드 > SQL Editor 에서 이 파일 내용을 그대로 실행하세요.

create table if not exists public.world_boss_state (
  id int primary key default 1,
  lord_index int not null default 0,
  current_hp bigint not null,
  max_hp bigint not null,
  phase int not null default 0,
  phase_event_until timestamptz,
  updated_at timestamptz not null default now()
);

insert into public.world_boss_state (id, lord_index, current_hp, max_hp)
values (1, 0, 500000, 500000)
on conflict (id) do nothing;

alter table public.world_boss_state enable row level security;

create policy "world_boss_state_select_all" on public.world_boss_state
  for select using (auth.role() = 'authenticated');

create table if not exists public.world_boss_challenges (
  id uuid primary key default gen_random_uuid(),
  lord_index int not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  nickname text not null,
  damage bigint not null,
  created_at timestamptz not null default now()
);

alter table public.world_boss_challenges enable row level security;

create policy "world_boss_challenges_select_all" on public.world_boss_challenges
  for select using (auth.role() = 'authenticated');

-- 도전 처리 함수: 여러 명이 동시에 도전해도 순서대로 안전하게 체력을 깎고,
-- 보스가 쓰러지면 참여자 전원 보상 지급 + 막타 보너스 + 다음 군주로 교체까지 한 번에 처리한다.
create or replace function public.challenge_world_boss(p_damage bigint, p_nickname text)
returns table (
  result_hp bigint,
  result_max_hp bigint,
  was_lethal boolean,
  result_lord_index int,
  phase_event_started boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_hp bigint;
  v_max_hp bigint;
  v_lord_index int;
  v_phase int;
  v_applied_damage bigint;
  v_new_hp bigint;
  v_new_phase int;
  v_phase_event_started boolean := false;
  v_was_lethal boolean := false;
  v_participant record;
begin
  select current_hp, max_hp, lord_index, phase into v_current_hp, v_max_hp, v_lord_index, v_phase
  from public.world_boss_state where id = 1
  for update;

  if v_current_hp <= 0 then
    return query select v_current_hp, v_max_hp, false, v_lord_index, false;
    return;
  end if;

  v_applied_damage := least(p_damage, v_current_hp);
  v_new_hp := v_current_hp - v_applied_damage;
  v_was_lethal := v_new_hp <= 0;

  v_new_phase := case
    when v_new_hp::float / v_max_hp <= 0.25 then 3
    when v_new_hp::float / v_max_hp <= 0.5 then 2
    when v_new_hp::float / v_max_hp <= 0.75 then 1
    else 0
  end;

  if v_new_phase > v_phase then
    v_phase_event_started := true;
  end if;

  update public.world_boss_state
  set current_hp = v_new_hp,
      phase = v_new_phase,
      phase_event_until = case when v_phase_event_started then now() + interval '30 minutes' else phase_event_until end,
      updated_at = now()
  where id = 1;

  insert into public.world_boss_challenges (lord_index, user_id, nickname, damage)
  values (v_lord_index, auth.uid(), p_nickname, v_applied_damage);

  if v_was_lethal then
    for v_participant in
      select user_id, sum(damage) as total_damage
      from public.world_boss_challenges
      where lord_index = v_lord_index
      group by user_id
    loop
      update public.characters
      set progress = jsonb_set(
        coalesce(progress, '{}'::jsonb),
        '{gold}',
        to_jsonb(coalesce((progress->>'gold')::numeric, 0) + 200 + least(v_participant.total_damage / 1000, 5000))
      )
      where user_id = v_participant.user_id;
    end loop;

    update public.characters
    set progress = jsonb_set(
      coalesce(progress, '{}'::jsonb),
      '{gold}',
      to_jsonb(coalesce((progress->>'gold')::numeric, 0) + 1000)
    )
    where user_id = auth.uid();

    update public.world_boss_state
    set lord_index = v_lord_index + 1,
        max_hp = round(500000 * power(1.5, (v_lord_index + 1) / 2)),
        current_hp = round(500000 * power(1.5, (v_lord_index + 1) / 2)),
        phase = 0,
        phase_event_until = null,
        updated_at = now()
    where id = 1;
  end if;

  select current_hp, max_hp, lord_index into v_new_hp, v_max_hp, v_lord_index
  from public.world_boss_state where id = 1;

  return query select v_new_hp, v_max_hp, v_was_lethal, v_lord_index, v_phase_event_started;
end;
$$;

grant execute on function public.challenge_world_boss(bigint, text) to authenticated;
