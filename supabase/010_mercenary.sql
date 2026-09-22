-- 용병 빌리기: 지역 보스 도전 시 친구 캐릭터 1명을 데려가면 보상이 늘어나고,
-- 데려간 친구는 오프라인이어도 "용병 수당" 골드를 자동으로 받는다.
-- Supabase 대시보드 > SQL Editor 에서 이 파일 내용을 그대로 실행하세요.

create table if not exists public.mercenary_hires (
  id uuid primary key default gen_random_uuid(),
  hirer_id uuid not null references auth.users(id) on delete cascade,
  hirer_nickname text not null,
  mercenary_id uuid not null references auth.users(id) on delete cascade,
  mercenary_nickname text not null,
  mercenary_level int not null,
  region_index int not null,
  fee_gold bigint not null,
  created_at timestamptz not null default now()
);

alter table public.mercenary_hires enable row level security;

create policy "mercenary_hires_select_own" on public.mercenary_hires
  for select using (auth.uid() = hirer_id);

create policy "mercenary_hires_insert_own" on public.mercenary_hires
  for insert with check (auth.uid() = hirer_id);

-- 용병으로 뽑힌 친구에게 수당을 자동으로 지급하는 트리거 (오프라인이어도 적용된다)
create or replace function public.handle_new_mercenary_hire()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.characters
  set progress = jsonb_set(
    coalesce(progress, '{}'::jsonb),
    '{gold}',
    to_jsonb(coalesce((progress->>'gold')::numeric, 0) + new.fee_gold)
  )
  where user_id = new.mercenary_id;
  return new;
end;
$$;

drop trigger if exists on_mercenary_hire_created on public.mercenary_hires;
create trigger on_mercenary_hire_created
  after insert on public.mercenary_hires
  for each row execute function public.handle_new_mercenary_hire();
