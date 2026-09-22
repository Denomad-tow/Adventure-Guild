-- 파견(원정대)에 동행한 친구에게 사례금을 자동 지급한다 (오프라인이어도 적용).
-- Supabase 대시보드 > SQL Editor 에서 이 파일 내용을 그대로 실행하세요.

create table if not exists public.expedition_companions (
  id uuid primary key default gen_random_uuid(),
  hirer_id uuid not null references auth.users(id) on delete cascade,
  hirer_nickname text not null,
  companion_id uuid not null references auth.users(id) on delete cascade,
  companion_nickname text not null,
  mission_id text not null,
  fee_gold bigint not null,
  created_at timestamptz not null default now()
);

alter table public.expedition_companions enable row level security;

create policy "expedition_companions_select_own" on public.expedition_companions
  for select using (auth.uid() = hirer_id);

create policy "expedition_companions_insert_own" on public.expedition_companions
  for insert with check (auth.uid() = hirer_id);

create or replace function public.handle_new_expedition_companion()
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
  where user_id = new.companion_id;
  return new;
end;
$$;

drop trigger if exists on_expedition_companion_created on public.expedition_companions;
create trigger on_expedition_companion_created
  after insert on public.expedition_companions
  for each row execute function public.handle_new_expedition_companion();
