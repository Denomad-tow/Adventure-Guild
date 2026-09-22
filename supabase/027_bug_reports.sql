-- 버그 제보: 플레이어가 게임 안에서 바로 버그를 알릴 수 있게 한다.
-- 운영자(나)는 Supabase 테이블 편집기에서 bug_reports 테이블을 보고 확인하면 된다.
-- Supabase 대시보드 > SQL Editor 에서 이 파일 내용을 그대로 실행하세요.

create table if not exists public.bug_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nickname text not null,
  message text not null,
  status text not null default '접수됨',
  admin_response text,
  created_at timestamptz not null default now()
);

alter table public.bug_reports enable row level security;

create policy "bug_reports_select_own" on public.bug_reports
  for select using (auth.uid() = user_id);

create policy "bug_reports_insert_own" on public.bug_reports
  for insert with check (auth.uid() = user_id);
