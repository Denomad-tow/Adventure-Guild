import { supabase } from "./supabaseClient";
import { hasElementAdvantage, elementAdvantageMultiplier } from "@/config/elements";
import { jobBattleStats, getTotalAttack } from "@/config/balance";
import {
  worldBossDailyChallengeLimit,
  worldBossChallengeDurationSeconds,
  worldBossGreedGoldBonusPer1000Percent,
  worldBossGreedGoldBonusCapPercent,
  worldBossFrostCursePenaltyPercent,
  worldBossPlaguePriestMultiplier,
  worldBossStormWindowMinutes,
  worldBossStormBonusPerChallengerPercent,
  worldBossPhaseDamageMultiplier,
  getWorldBossLord,
} from "@/config/worldBoss";
import { emptyResearchBonuses } from "@/config/research";

const oneDayMs = 24 * 60 * 60 * 1000;

// 폭풍의 군주(그리고 균열의 왕)용: 최근 N분 안에 이 군주(이 난이도)에게 도전한 서로 다른 길드원 수.
export async function countRecentChallengers(tier, lordIndex) {
  const since = new Date(Date.now() - worldBossStormWindowMinutes * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("world_boss_challenges")
    .select("user_id")
    .eq("tier", tier)
    .eq("lord_index", lordIndex)
    .gte("created_at", since);
  return new Set((data ?? []).map((row) => row.user_id)).size;
}

// 난이도(쉬움/보통/어려움)마다 완전히 독립된 체력바/군주 진행도를 가진다.
export async function fetchWorldBossState(tier = "easy") {
  const { data } = await supabase.from("world_boss_state").select("*").eq("tier", tier).maybeSingle();
  return data;
}

export async function countMyChallengesToday(userId, tier) {
  const since = new Date(Date.now() - oneDayMs).toISOString();
  const { count } = await supabase
    .from("world_boss_challenges")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("tier", tier)
    .gte("created_at", since);
  return count ?? 0;
}

export async function getRemainingChallengesToday(userId, tier) {
  const used = await countMyChallengesToday(userId, tier);
  return Math.max(0, worldBossDailyChallengeLimit - used);
}

// 이번 군주(이 난이도)에게 다들 얼마나 피해를 줬는지(기여도) 보여주기 위한 순위표.
export async function fetchContributionBoard(tier, lordIndex) {
  const { data } = await supabase
    .from("world_boss_challenges")
    .select("nickname, damage")
    .eq("tier", tier)
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

// 도전 한 번의 피해량을 계산한다. 실제 전투 화면과 같은 공격력 계산에 군주별 특수 규칙과
// 페이즈 이벤트(피해 2배)를 더한다.
// weaknessOverride: 환영의 군주처럼 도전마다 약점이 랜덤으로 바뀌는 경우 이 값을 대신 쓴다.
// recentChallengerCount: 폭풍의 군주(와 균열의 왕)의 "동시 도전자 수" 계산에 쓴다.
export function computeChallengeDamage({
  job,
  level,
  enhanceLevel,
  equipBonuses,
  traitBonuses,
  advancedClassBonuses,
  researchBonuses,
  gold,
  lordIndex,
  phaseEventActive,
  weaknessOverride,
  recentChallengerCount = 0,
}) {
  const acb = advancedClassBonuses ?? {
    attackPercent: 0,
    attackSpeedPercent: 0,
    critRate: 0,
    critDamage: 0,
    elementAdvantageBonus: 0,
  };
  const rb = researchBonuses ?? emptyResearchBonuses;
  const ueb = equipBonuses.uniqueEffectBonuses ?? { elementAdvantageBonus: 0, critRate: 0 };
  const stats = jobBattleStats[job] ?? jobBattleStats.warrior;
  const baseAttack = getTotalAttack(job, level, enhanceLevel) + equipBonuses.attackFlat;
  let attack =
    baseAttack *
    (1 +
      (traitBonuses.attackPercent +
        (equipBonuses.attackPercent ?? 0) +
        (acb.attackPercent ?? 0) +
        rb.attackPercent) /
        100);

  const lord = getWorldBossLord(lordIndex);
  const weakness = weaknessOverride ?? lord.weakness;
  if (weakness && hasElementAdvantage(equipBonuses.weaponElement, weakness)) {
    attack *= elementAdvantageMultiplier + acb.elementAdvantageBonus + ueb.elementAdvantageBonus;
  }

  if ((lord.id === "plague" || lord.id === "riftking") && job === "priest") {
    attack *= worldBossPlaguePriestMultiplier;
  }

  const critRate =
    stats.critRate + equipBonuses.critRate / 100 + acb.critRate / 100 + ueb.critRate / 100 + rb.critRate / 100;
  const critDamage = stats.critDamage + equipBonuses.critDamage / 100 + acb.critDamage / 100;
  // 강철의 군주(와 균열의 왕): 치명타가 아닌 타격은 사실상 안 통하니, 치명타 몫만 남긴다.
  const avgCritMultiplier =
    lord.id === "steel" || lord.id === "riftking" ? critRate * critDamage : 1 + critRate * (critDamage - 1);

  const attackSpeed =
    stats.attackSpeed * (1 + (traitBonuses.attackSpeedPercent + acb.attackSpeedPercent + rb.attackSpeedPercent) / 100);
  let hitsPerSecond = attackSpeed;

  if (lord.id === "frost") {
    hitsPerSecond *= 1 - worldBossFrostCursePenaltyPercent / 100;
  }

  let totalDamage = attack * avgCritMultiplier * hitsPerSecond * worldBossChallengeDurationSeconds;

  if (lord.id === "greed" || lord.id === "riftking") {
    const bonusPercent = Math.min(
      Math.floor(gold / 1000) * worldBossGreedGoldBonusPer1000Percent,
      worldBossGreedGoldBonusCapPercent
    );
    totalDamage *= 1 + bonusPercent / 100;
  }

  if (lord.id === "storm" || lord.id === "riftking") {
    totalDamage *= 1 + (recentChallengerCount * worldBossStormBonusPerChallengerPercent) / 100;
  }

  if (phaseEventActive) {
    totalDamage *= worldBossPhaseDamageMultiplier;
  }

  return Math.round(totalDamage);
}

// 연대기 화면용: 내가 참여해서 이미 처치가 끝난 군주들의 id 목록(중복 없이).
// 난이도 3개가 각자 독립적으로 진행되므로, 어느 난이도에서든 처치에 참여했으면 이야기가 열린다.
export async function fetchDefeatedLordIds(userId) {
  const [{ data: myChallenges }, easyState, normalState, hardState] = await Promise.all([
    supabase.from("world_boss_challenges").select("lord_index, tier").eq("user_id", userId),
    fetchWorldBossState("easy"),
    fetchWorldBossState("normal"),
    fetchWorldBossState("hard"),
  ]);
  const currentLordIndexByTier = {
    easy: easyState?.lord_index ?? 0,
    normal: normalState?.lord_index ?? 0,
    hard: hardState?.lord_index ?? 0,
  };
  const defeatedIds = new Set();
  for (const row of myChallenges ?? []) {
    const currentLordIndex = currentLordIndexByTier[row.tier ?? "easy"] ?? 0;
    if (row.lord_index < currentLordIndex) {
      defeatedIds.add(getWorldBossLord(row.lord_index).id);
    }
  }
  return defeatedIds;
}

export async function challengeWorldBoss(damage, nickname, tier = "easy") {
  const { data, error } = await supabase.rpc("challenge_world_boss", {
    p_damage: damage,
    p_nickname: nickname,
    p_tier: tier,
  });
  if (error) return { error };
  return { result: data?.[0], error: null };
}
