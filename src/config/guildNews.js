// 길드 소식 종류. 각자 더보기 탭에서 원하는 종류만 켜고 끌 수 있다.
export const guildNewsCategories = [
  { id: "region_clear", label: "지역 개척" },
  { id: "legendary_drop", label: "전설/신화 장비 획득" },
  { id: "enhance_fail", label: "강화 실패" },
  { id: "building_levelup", label: "길드 마을 레벨업" },
  { id: "world_boss_defeat", label: "월드 보스 처치" },
  { id: "world_boss_loot", label: "월드 보스 보상 장비" },
];

export function getDefaultNewsFilters() {
  const filters = {};
  for (const category of guildNewsCategories) {
    filters[category.id] = true;
  }
  return filters;
}

export function isNewsCategoryVisible(newsFilters, category) {
  if (!newsFilters) return true;
  if (!(category in newsFilters)) return true;
  return newsFilters[category] !== false;
}
