-- 펫(동료): 사냥 중 낮은 확률로 알을 얻고, 시간이 지나면 부화시킬 수 있다.
-- Supabase 대시보드 > SQL Editor 에서 이 파일 내용을 그대로 실행하세요.

create table if not exists public.pets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  species_id text not null,
  is_egg boolean not null default true,
  hatch_at timestamptz not null,
  level int not null default 1,
  exp int not null default 0,
  equipped boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.pets enable row level security;

create policy "pets_select_own" on public.pets
  for select using (auth.uid() = user_id);

create policy "pets_insert_own" on public.pets
  for insert with check (auth.uid() = user_id);

create policy "pets_update_own" on public.pets
  for update using (auth.uid() = user_id);

create policy "pets_delete_own" on public.pets
  for delete using (auth.uid() = user_id);

-- 한 번에 하나만 "데리고 다니기"(장착) 할 수 있다.
create unique index if not exists pets_one_equipped_per_user
  on public.pets (user_id)
  where equipped;
