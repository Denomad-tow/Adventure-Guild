import { supabase } from "./supabaseClient";
import { hasElementAdvantage, elementAdvantageMultiplier } from "@/config/elements";
import { jobBattleStats, getTotalAttack } from "@/config/balance";
import {
  worldBossDailyChallengeLimit,
  worldBossChallengeDurationSeconds,
  worldBossGreedGoldBonusPer1000Percent,
  worldBossGreedGoldBonusCapPercent,
  worldBossFrostCursePenaltyPercent,
  worldBossPhaseDamageMultiplier,
  getWorldBossLord,
} from "@/config/worldBoss";

const oneDayMs = 24 * 60 * 60 * 1000;

export async function fetchWorldBossState() {
  const { data } = await supabase.from("world_boss_state").select("*").eq("id", 1).maybeSingle();
  return data;
}

export async function countMyChallengesToday(userId, lordIndex) {
  const since = new Date(Date.now() - oneDayMs).toISOString();
  const { count } = await supabase
    .from("world_boss_challenges")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("lord_index", lordIndex)
    .gte("created_at", since);
  return count ?? 0;
}

export async function getRemainingChallengesToday(userId, lordIndex) {
  const used = await countMyChallengesToday(userId, lordIndex);
  return Math.max(0, worldBossDailyChallengeLimit - used);
}

// 이번 군주에게 다들 얼마나 피해를 줬는지(기여도) 보여주기 위한 순위표. 안내용이라 서버 계산 없이 간단히 모은다.
export async function fetchContributionBoard(lordIndex) {
  const { data } = await supabase
    .from("world_boss_challenges")
    .select("nickname, damage")
    .eq("lord_index", lordIndex);

  const totals = {};
  for (const row of data ?? []) {
    totals[row.nickname] = (totals[row.nickname] ?? 0) + row.damage;
  }
  return Object.entries(totals)
    .map(([nickname, damage]) => ({ nickname, damage }))
    .sort((a, b) => b.damage - a.damage)
    .slice(0, 5);
}

// 도전 한 번의 피해량을 계산한다. 실제 전투 화면과 같은 공격력 계산에,
// 군주별 특수 규칙(탐욕: 골드 보너스, 서리: 공격속도 저주)과 페이즈 이벤트(피해 2배)를 더한다.
export function computeChallengeDamage({ job, level, enhanceLevel, equipBonuses, traitBonuses, gold, lordIndex, phaseEventActive }) {
  const stats = jobBattleStats[job] ?? jobBattleStats.warrior;
  const baseAttack = getTotalAttack(job, level, enhanceLevel) + equipBonuses.attackFlat;
  let attack = baseAttack * (1 + traitBonuses.attackPercent / 100);

  const lord = getWorldBossLord(lordIndex);
  if (hasElementAdvantage(equipBonuses.weaponElement, lord.weakness)) {
    attack *= elementAdvantageMultiplier;
  }

  const critRate = stats.critRate + equipBonuses.critRate / 100;
  const critDamage = stats.critDamage + equipBonuses.critDamage / 100;
  const avgCritMultiplier = 1 + critRate * (critDamage - 1);

  const attackSpeed = stats.attackSpeed * (1 + traitBonuses.attackSpeedPercent / 100);
  let hitsPerSecond = attackSpeed;

  if (lord.id === "frost") {
    hitsPerSecond *= 1 - worldBossFrostCursePenaltyPercent / 100;
  }

  let totalDamage = attack * avgCritMultiplier * hitsPerSecond * worldBossChallengeDurationSeconds;

  if (lord.id === "greed") {
    const bonusPercent = Math.min(
      Math.floor(gold / 1000) * worldBossGreedGoldBonusPer1000Percent,
      worldBossGreedGoldBonusCapPercent
    );
    totalDamage *= 1 + bonusPercent / 100;
  }

  if (phaseEventActive) {
    totalDamage *= worldBossPhaseDamageMultiplier;
  }

  return Math.round(totalDamage);
}

export async function challengeWorldBoss(damage, nickname) {
  const { data, error } = await supabase.rpc("challenge_world_boss", {
    p_damage: damage,
    p_nickname: nickname,
  });
  if (error) return { error };
  return { result: data?.[0], error: null };
}
