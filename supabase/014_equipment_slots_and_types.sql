-- 장비 부위를 6개 → 10개로 확장(벨트, 목걸이, 팔찌, 반지 2개)하고,
-- 부위마다 여러 "장비 종류"(예: 투구 → 모자/투구/두건/왕관/가면)를 표현할 수 있게 item_type 컬럼을 추가한다.
-- Supabase 대시보드 > SQL Editor 에서 이 파일 내용을 그대로 실행하세요.

-- 기존 규칙(옛 6부위만 허용)을 먼저 없애야, 아래에서 "장신구→목걸이" 변경이 막히지 않는다.
alter table public.equipment drop constraint if exists equipment_slot_check;

-- 기존에 "장신구(accessory)"였던 장비는 새 부위 중 하나(목걸이)로 옮겨준다.
update public.equipment set slot = 'necklace' where slot = 'accessory';

alter table public.equipment add constraint equipment_slot_check
  check (slot in ('weapon', 'helmet', 'armor', 'gloves', 'boots', 'belt', 'necklace', 'bracelet', 'ring1', 'ring2'));

alter table public.equipment add column if not exists item_type text;
