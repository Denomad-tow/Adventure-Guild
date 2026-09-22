-- 우편함: 운영자(나)가 특정 플레이어에게 보상/메시지를 보내면, 그 플레이어가 게임 안에서 수령한다.
-- 우편은 게임 화면에서 보내는 게 아니라, 이 SQL 파일 실행 후 아래 안내대로 Supabase에서 직접 넣어준다.
-- Supabase 대시보드 > SQL Editor 에서 이 파일 내용을 그대로 실행하세요.

create table if not exists public.mailbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text,
  reward_gold bigint not null default 0,
  reward_stones bigint not null default 0,
  reward_soul_stones bigint not null default 0,
  claimed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.mailbox enable row level security;

create policy "mailbox_select_own" on public.mailbox
  for select using (auth.uid() = user_id);

-- 보상 수령 함수: 우편의 보상을 캐릭터에게 지급하고 수령 완료 처리한다.
-- (클라이언트가 직접 mailbox를 고치지 못하게, insert/update 정책은 두지 않고 이 함수로만 처리한다)
create or replace function public.claim_mail(p_mail_id uuid)
returns table(reward_gold bigint, reward_stones bigint, reward_soul_stones bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mail record;
begin
  select * into v_mail from public.mailbox where id = p_mail_id and user_id = auth.uid() for update;

  if v_mail is null then
    raise exception '우편을 찾을 수 없습니다.';
  end if;

  if v_mail.claimed then
    raise exception '이미 수령한 우편입니다.';
  end if;

  update public.characters
  set progress = jsonb_set(
    jsonb_set(
      jsonb_set(
        coalesce(progress, '{}'::jsonb),
        '{gold}',
        to_jsonb(coalesce((progress->>'gold')::numeric, 0) + v_mail.reward_gold)
      ),
      '{enhancementStones}',
      to_jsonb(coalesce((progress->>'enhancementStones')::numeric, 0) + v_mail.reward_stones)
    ),
    '{soulStones}',
    to_jsonb(coalesce((progress->>'soulStones')::numeric, 0) + v_mail.reward_soul_stones)
  )
  where user_id = auth.uid();

  update public.mailbox set claimed = true where id = p_mail_id;

  return query select v_mail.reward_gold, v_mail.reward_stones, v_mail.reward_soul_stones;
end;
$$;

grant execute on function public.claim_mail(uuid) to authenticated;
