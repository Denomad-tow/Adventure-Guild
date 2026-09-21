-- 캐릭터(모험가) 정보를 저장하는 표
-- Supabase 대시보드 > SQL Editor 에서 이 파일 내용을 그대로 실행하세요.

create table if not exists public.characters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  nickname text not null unique,
  job text not null check (job in ('warrior', 'mage', 'archer', 'priest')),
  level integer not null default 1,
  -- progress: 골드/경험치 등 앞으로 계속 추가될 값들을 넣는 자리.
  -- 컬럼을 매번 추가하지 않고도 새 항목을 쉽게 붙일 수 있도록 유연한 형식(jsonb)으로 둔다.
  progress jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- 본인 데이터만 읽고/쓸 수 있도록 보안 규칙(RLS) 적용
alter table public.characters enable row level security;

create policy "characters_select_own" on public.characters
  for select using (auth.uid() = user_id);

create policy "characters_insert_own" on public.characters
  for insert with check (auth.uid() = user_id);

create policy "characters_update_own" on public.characters
  for update using (auth.uid() = user_id);
