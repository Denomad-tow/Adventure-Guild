-- 군주가 2명 → 7명으로 늘어나면서, 한 바퀴(모든 군주 처치) 계산 기준이 2에서 7로 바뀐다.
-- (기존 함수는 "2명씩 한 바퀴"로 계산되어 있어서 고쳐야 한다)
-- Supabase 대시보드 > SQL Editor 에서 이 파일 내용을 그대로 실행하세요.

create or replace function public.challenge_world_boss(p_damage bigint, p_nickname text)
returns table (
  result_hp bigint,
  result_max_hp bigint,
  was_lethal boolean,
  result_lord_index int,
  phase_event_started boolean,
  my_reward_gold bigint,
  my_loot_grade text
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
  v_participation_reward bigint;
  v_contribution_pool bigint;
  v_final_blow_bonus bigint;
  v_participant_reward bigint;
  v_my_reward bigint := 0;
  v_my_loot_grade text := null;
  v_loot_roll float;
  v_loot_grade text;
  v_loot_slot text;
  v_loot_options jsonb;
  v_loot_element text;
  v_slots text[] := array['weapon', 'helmet', 'armor', 'gloves', 'boots', 'belt', 'necklace', 'bracelet', 'ring1', 'ring2'];
  v_elements text[] := array['자연', '어둠', '물', '불', '빛'];
  v_secondary_options text[] := array['critRate', 'critDamage', 'goldFind'];
begin
  select current_hp, max_hp, lord_index, phase into v_current_hp, v_max_hp, v_lord_index, v_phase
  from public.world_boss_state where id = 1
  for update;

  if v_current_hp <= 0 then
    return query select v_current_hp, v_max_hp, false, v_lord_index, false, 0::bigint, null::text;
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
    v_participation_reward := round(v_max_hp * 0.006);
    v_contribution_pool := round(v_max_hp * 0.1);
    v_final_blow_bonus := round(v_max_hp * 0.02);

    for v_participant in
      select user_id, sum(damage) as total_damage
      from public.world_boss_challenges
      where lord_index = v_lord_index
      group by user_id
    loop
      v_participant_reward := v_participation_reward
        + round(v_contribution_pool * v_participant.total_damage::float / v_max_hp);

      v_loot_roll := random();
      v_loot_grade := null;
      if v_loot_roll < 0.003 then
        v_loot_grade := 'mythic';
      elsif v_loot_roll < 0.003 + 0.03 then
        v_loot_grade := 'legendary';
      end if;

      if v_loot_grade is not null then
        v_loot_slot := v_slots[1 + floor(random() * array_length(v_slots, 1))::int];
        v_loot_element := case when v_loot_slot = 'weapon' then v_elements[1 + floor(random() * array_length(v_elements, 1))::int] else null end;
        v_loot_options := jsonb_build_array(
          jsonb_build_object('type', 'attackFlat', 'value', 1 + floor(random() * 5)::int),
          jsonb_build_object(
            'type', v_secondary_options[1 + floor(random() * array_length(v_secondary_options, 1))::int],
            'value', 3 + floor(random() * 8)::int
          )
        );
        insert into public.equipment (user_id, slot, grade, options, set_id, element)
        values (v_participant.user_id, v_loot_slot, v_loot_grade, v_loot_options, null, v_loot_element);
      end if;

      update public.characters
      set progress = jsonb_set(
        coalesce(progress, '{}'::jsonb),
        '{gold}',
        to_jsonb(coalesce((progress->>'gold')::numeric, 0) + v_participant_reward)
      )
      where user_id = v_participant.user_id;

      if v_participant.user_id = auth.uid() then
        v_my_reward := v_participant_reward;
        v_my_loot_grade := v_loot_grade;
      end if;
    end loop;

    update public.characters
    set progress = jsonb_set(
      progress,
      '{gold}',
      to_jsonb(coalesce((progress->>'gold')::numeric, 0) + v_final_blow_bonus)
    )
    where user_id = auth.uid();
    v_my_reward := v_my_reward + v_final_blow_bonus;

    -- 일곱 군주가 한 바퀴(7명) 돌 때마다 체력이 늘어난다.
    update public.world_boss_state
    set lord_index = v_lord_index + 1,
        max_hp = round(500000 * power(1.5, (v_lord_index + 1) / 7)),
        current_hp = round(500000 * power(1.5, (v_lord_index + 1) / 7)),
        phase = 0,
        phase_event_until = null,
        updated_at = now()
    where id = 1;
  end if;

  select current_hp, max_hp, lord_index into v_new_hp, v_max_hp, v_lord_index
  from public.world_boss_state where id = 1;

  return query select v_new_hp, v_max_hp, v_was_lethal, v_lord_index, v_phase_event_started, v_my_reward, v_my_loot_grade;
end;
$$;

grant execute on function public.challenge_world_boss(bigint, text) to authenticated;
