import { monsterDexTiers, monsterDexBonusPercents } from "@/config/monsterDex";

export function getMonsterKey(regionId, monsterName) {
  return `${regionId}:${monsterName}`;
}

// 처치 수에 따른 도감 등급 (0 = 미등록)
export function getDexTier(count) {
  let tier = 0;
  for (const threshold of monsterDexTiers) {
    if (count >= threshold) tier += 1;
  }
  return tier;
}

export function getDexBonusPercent(count) {
  const tier = getDexTier(count);
  return tier === 0 ? 0 : monsterDexBonusPercents[tier - 1];
}

// 저장되어 있던 도감 기록에 이번에 잡은 만큼(deltas: {몬스터키: 마릿수})을 더한다.
export function applyDexKills(dex, deltas = {}) {
  const next = { ...(dex ?? {}) };
  for (const [key, amount] of Object.entries(deltas)) {
    if (!amount) continue;
    next[key] = (next[key] ?? 0) + amount;
  }
  return next;
}

export function isRegionDexComplete(dex, region) {
  return region.monsters.every((m) => (dex?.[getMonsterKey(region.id, m.name)] ?? 0) >= 1);
}

export function getCompletedRegionCount(dex, regions) {
  return regions.filter((region) => isRegionDexComplete(dex, region)).length;
}
