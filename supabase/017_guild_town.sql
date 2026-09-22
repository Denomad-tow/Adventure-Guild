-- 길드 마을 건설: 길드원 전체가 골드를 기부해서 건물을 짓는다. 효과는 전원에게 적용된다.
-- Supabase 대시보드 > SQL Editor 에서 이 파일 내용을 그대로 실행하세요.

create table if not exists public.guild_town_buildings (
  building_id text primary key,
  level int not null default 0,
  progress_gold bigint not null default 0
);

insert into public.guild_town_buildings (building_id)
values ('forge'), ('magicTower'), ('inn'), ('trainingGround'), ('treasury'), ('guildBoard')
on conflict (building_id) do nothing;

alter table public.guild_town_buildings enable row level security;

create policy "guild_town_buildings_select_all" on public.guild_town_buildings
  for select using (auth.role() = 'authenticated');

create table if not exists public.guild_town_contributions (
  id uuid primary key default gen_random_uuid(),
  building_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  nickname text not null,
  amount bigint not null,
  created_at timestamptz not null default now()
);

alter table public.guild_town_contributions enable row level security;

create policy "guild_town_contributions_select_all" on public.guild_town_contributions
  for select using (auth.role() = 'authenticated');

-- 기부 처리 함수: 기부자의 골드를 차감하고 건물 진행도에 더한다(여러 명이 동시에 기부해도 안전).
-- 비용 공식(5000 * 1.25^레벨)은 src/config/guildTown.js와 같은 값을 유지해야 한다.
create or replace function public.contribute_to_building(p_building_id text, p_amount bigint)
returns table(result_level int, result_progress_gold bigint, leveled_up boolean, result_nickname text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gold numeric;
  v_nickname text;
  v_level int;
  v_progress bigint;
  v_cost bigint;
  v_level_before int;
begin
  if p_amount <= 0 then
    raise exception '기부 금액은 0보다 커야 합니다.';
  end if;

  select coalesce((progress->>'gold')::numeric, 0), nickname into v_gold, v_nickname
  from public.characters where user_id = auth.uid()
  for update;

  if v_gold < p_amount then
    raise exception '골드가 부족합니다.';
  end if;

  update public.characters
  set progress = jsonb_set(progress, '{gold}', to_jsonb(v_gold - p_amount))
  where user_id = auth.uid();

  select level, progress_gold into v_level, v_progress
  from public.guild_town_buildings where building_id = p_building_id
  for update;

  v_level_before := v_level;
  v_progress := v_progress + p_amount;
  v_cost := round(5000 * power(1.25, v_level));

  while v_level < 20 and v_progress >= v_cost loop
    v_progress := v_progress - v_cost;
    v_level := v_level + 1;
    v_cost := round(5000 * power(1.25, v_level));
  end loop;

  update public.guild_town_buildings
  set level = v_level, progress_gold = v_progress
  where building_id = p_building_id;

  insert into public.guild_town_contributions (building_id, user_id, nickname, amount)
  values (p_building_id, auth.uid(), v_nickname, p_amount);

  return query select v_level, v_progress, (v_level > v_level_before), v_nickname;
end;
$$;

grant execute on function public.contribute_to_building(text, bigint) to authenticated;
