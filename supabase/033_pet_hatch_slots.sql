-- 펫 부화칸: 알을 주우면 바로 부화 시간이 흐르는 게 아니라, 3개의 "부화칸" 중 하나에 넣어야 시간이 흐른다.
-- 부화칸에 넣지 않은 알은 그냥 대기 상태로 가방에 남아있는다.
-- Supabase 대시보드 > SQL Editor 에서 이 파일 내용을 그대로 실행하세요.

alter table public.pets add column if not exists hatch_slot int;
alter table public.pets alter column hatch_at drop not null;

-- 이미 부화 시간이 흐르고 있던(이번 패치 이전에 얻은) 알들은 그대로 1번 부화칸에 있는 것으로 인정해서
-- 갑자기 진행이 끊기지 않게 한다. (부화칸 3개 중 먼저 만든 최대 3개까지만 슬롯을 배정)
with numbered as (
  select id, row_number() over (partition by user_id order by created_at) as rn
  from public.pets
  where is_egg and hatch_at is not null and hatch_slot is null
)
update public.pets p
set hatch_slot = numbered.rn
from numbered
where p.id = numbered.id and numbered.rn <= 3;

-- 슬롯을 못 받은 나머지 오래된 알은 대기 상태로 되돌린다 (부화칸에 다시 넣어야 함).
update public.pets
set hatch_at = null
where is_egg and hatch_slot is null;
