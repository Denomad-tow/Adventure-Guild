-- 월드 보스 난이도(쉬움/보통/어려움)를 완전히 독립된 체력바로 분리한다.
-- 지금까지는 난이도를 바꿔도 전리품 품질만 다르고 체력/피해량은 길드 전체가 공유하는 체력바 하나였는데,
-- 이제 난이도마다 완전히 다른 보스 인스턴스(체력, 군주 순서, 기여도 순위)를 갖는다.
-- 어려운 난이도일수록 체력이 훨씬 크므로, 여러 명이 힘을 합쳐야 무너뜨릴 수 있다.
-- Supabase 대시보드 > SQL Editor 에서 이 파일 내용을 그대로 실행하세요.

alter table public.world_boss_state add column if not exists tier text;
update public.world_boss_state set tier = 'easy' where tier is null;
alter table public.world_boss_state alter column tier set not null;
alter table public.world_boss_state alter column tier set default 'easy';
create unique index if not exists world_boss_state_tier_key on public.world_boss_state (tier);

-- id 컬럼 기본값이 고정된 1이라(자동 증가가 아님), 새 행에는 반드시 다른 id를 직접 지정해야 한다.
insert into public.world_boss_state (id, tier, lord_index, current_hp, max_hp)
values
  (2, 'normal', 0, 1250000, 1250000),
  (3, 'hard', 0, 3000000, 3000000)
on conflict (tier) do nothing;

-- 예전 (damage, nickname, tier) 버전은 체력바를 tier로 구분하지 못했으므로 새 버전으로 완전히 교체한다.
drop function if exists public.challenge_world_boss(bigint, text, text);

create or replace function public.challenge_world_boss(p_damage bigint, p_nickname text, p_tier text default 'easy')
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
  v_my_level int;
  v_tier text;
  v_tier_rank int;
  v_hp_multiplier float;
  v_loot_roll float;
  v_loot_grade text;
  v_loot_slot text;
  v_loot_options jsonb;
  v_loot_element text;
  v_option_pool text[] := array['attackPercent', 'critRate', 'critDamage', 'goldFind', 'dropChancePercent'];
  v_option_types text[];
  v_option_count int;
  v_grade_multiplier float;
  v_tier_value_multiplier float;
  v_type text;
  v_min int;
  v_max int;
  v_slots text[] := array['weapon', 'helmet', 'armor', 'gloves', 'boots', 'belt', 'necklace', 'bracelet', 'ring1', 'ring2'];
  v_elements text[] := array['자연', '어둠', '물', '불', '빛'];
begin
  -- 요청한 난이도가 실제 레벨로 도전 가능한지 서버에서도 확인한다 (클라이언트 조작 방지).
  select level into v_my_level from public.characters where user_id = auth.uid();
  v_tier := case
    when p_tier = 'hard' and coalesce(v_my_level, 0) >= 500 then 'hard'
    when p_tier in ('hard', 'normal') and coalesce(v_my_level, 0) >= 100 then 'normal'
    else 'easy'
  end;
  v_tier_rank := case v_tier when 'hard' then 2 when 'normal' then 1 else 0 end;
  v_hp_multiplier := case v_tier when 'hard' then 6 when 'normal' then 2.5 else 1 end;

  select current_hp, max_hp, lord_index, phase into v_current_hp, v_max_hp, v_lord_index, v_phase
  from public.world_boss_state where tier = v_tier
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
  where tier = v_tier;

  insert into public.world_boss_challenges (lord_index, user_id, nickname, damage, tier)
  values (v_lord_index, auth.uid(), p_nickname, v_applied_damage, v_tier);

  if v_was_lethal then
    v_participation_reward := round(v_max_hp * 0.006);
    v_contribution_pool := round(v_max_hp * 0.1);
    v_final_blow_bonus := round(v_max_hp * 0.02);

    for v_participant in
      select c.user_id, sum(c.damage) as total_damage
      from public.world_boss_challenges c
      where c.lord_index = v_lord_index and c.tier = v_tier
      group by c.user_id
    loop
      v_participant_reward := v_participation_reward
        + round(v_contribution_pool * v_participant.total_damage::float / v_max_hp);

      v_tier_value_multiplier := case v_tier_rank when 2 then 1.3 when 1 then 1.15 else 1.0 end;

      -- 난이도별 전리품 등급 확률 (필드 드랍보다 훨씬 좋다: 최악이 "영웅" 등급).
      v_loot_roll := random();
      v_loot_grade := null;
      if v_tier_rank = 2 then
        if v_loot_roll < 0.10 then v_loot_grade := null;
        elsif v_loot_roll < 0.35 then v_loot_grade := 'epic';
        elsif v_loot_roll < 0.75 then v_loot_grade := 'legendary';
        else v_loot_grade := 'mythic';
        end if;
      elsif v_tier_rank = 1 then
        if v_loot_roll < 0.20 then v_loot_grade := null;
        elsif v_loot_roll < 0.60 then v_loot_grade := 'epic';
        elsif v_loot_roll < 0.90 then v_loot_grade := 'legendary';
        else v_loot_grade := 'mythic';
        end if;
      else
        if v_loot_roll < 0.30 then v_loot_grade := null;
        elsif v_loot_roll < 0.85 then v_loot_grade := 'epic';
        elsif v_loot_roll < 0.99 then v_loot_grade := 'legendary';
        else v_loot_grade := 'mythic';
        end if;
      end if;

      if v_loot_grade is not null then
        v_grade_multiplier := case v_loot_grade when 'epic' then 1.7 when 'legendary' then 2.3 else 3 end;
        v_option_count := least(
          5,
          (case v_loot_grade when 'epic' then 3 else 4 end) + (case v_tier_rank when 2 then 2 else 1 end)
        );

        -- 옵션 풀(5종)을 무작위로 섞어서 앞에서부터 v_option_count개를 중복 없이 뽑는다.
        select array_agg(t order by random()) into v_option_types from unnest(v_option_pool) as t;

        v_loot_options := '[]'::jsonb;
        for i in 1..v_option_count loop
          v_type := v_option_types[i];
          v_min := case v_type
            when 'attackPercent' then 1
            when 'critRate' then 1
            when 'critDamage' then 3
            when 'goldFind' then 3
            else 2
          end;
          v_max := case v_type
            when 'attackPercent' then 4
            when 'critRate' then 4
            when 'critDamage' then 10
            when 'goldFind' then 10
            else 6
          end;
          v_loot_options := v_loot_options || jsonb_build_array(
            jsonb_build_object(
              'type', v_type,
              'value', round((v_min + random() * (v_max - v_min)) * v_grade_multiplier * v_tier_value_multiplier)::int
            )
          );
        end loop;

        v_loot_slot := v_slots[1 + floor(random() * array_length(v_slots, 1))::int];
        v_loot_element := case when v_loot_slot = 'weapon' then v_elements[1 + floor(random() * array_length(v_elements, 1))::int] else null end;
        insert into public.equipment (user_id, slot, grade, options, set_id, element)
        values (v_participant.user_id, v_loot_slot, v_loot_grade, v_loot_options, 'worldboss', v_loot_element);
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

    -- 일곱 군주가 한 바퀴(7명) 돌 때마다 체력이 늘어난다 (난이도별 배율 적용).
    update public.world_boss_state
    set lord_index = v_lord_index + 1,
        max_hp = round(500000 * power(1.5, (v_lord_index + 1) / 7) * v_hp_multiplier),
        current_hp = round(500000 * power(1.5, (v_lord_index + 1) / 7) * v_hp_multiplier),
        phase = 0,
        phase_event_until = null,
        updated_at = now()
    where tier = v_tier;
  end if;

  select current_hp, max_hp, lord_index into v_new_hp, v_max_hp, v_lord_index
  from public.world_boss_state where tier = v_tier;

  return query select v_new_hp, v_max_hp, v_was_lethal, v_lord_index, v_phase_event_started, v_my_reward, v_my_loot_grade;
end;
$$;

grant execute on function public.challenge_world_boss(bigint, text, text) to authenticated;
