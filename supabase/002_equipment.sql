-- 장비(무기/투구/갑옷/장갑/신발/장신구) 저장용 표
-- Supabase 대시보드 > SQL Editor 에서 이 파일 내용을 그대로 실행하세요.

create table if not exists public.equipment (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slot text not null check (slot in ('weapon', 'helmet', 'armor', 'gloves', 'boots', 'accessory')),
  grade text not null check (grade in ('common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic')),
  -- options: [{ "type": "attackFlat", "value": 3 }, ...] 형태. 새 옵션 종류가 생겨도 컬럼을 안 늘려도 되게 유연한 형식.
  options jsonb not null default '[]'::jsonb,
  equipped boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.equipment enable row level security;

create policy "equipment_select_own" on public.equipment
  for select using (auth.uid() = user_id);

create policy "equipment_insert_own" on public.equipment
  for insert with check (auth.uid() = user_id);

create policy "equipment_update_own" on public.equipment
  for update using (auth.uid() = user_id);

create policy "equipment_delete_own" on public.equipment
  for delete using (auth.uid() = user_id);

-- 같은 부위에 두 개를 동시에 장착하는 실수를 DB 차원에서도 막아준다.
create unique index if not exists equipment_one_equipped_per_slot
  on public.equipment (user_id, slot)
  where equipped;
