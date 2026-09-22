// 퀘스트 진행도(일일/주간) 계산. 서버에는 자정/매주 초기화용 타이머를 따로 두지 않고,
// "오늘 날짜/이번 주"가 바뀌었는지를 매번 계산해서 값을 읽고 쓸 때 자동으로 초기화한다.

const emptyDaily = { kills: 0, cheers: 0, enhances: 0, boxClaimed: false };
const emptyWeekly = { regionBossClears: 0, claimedIds: [] };

export function getCurrentDailyDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

// ISO 8601 기준 주차 (월요일 시작). 예: "2026-W39"
export function getCurrentWeekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

// 이번 주가 시작된 시각(월요일 00:00 UTC). 월드 보스 도전 횟수처럼 별도 표에서 세는 값을 조회할 때 쓴다.
export function getCurrentWeekStartISO(date = new Date()) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - (dayNum - 1));
  return d.toISOString();
}

// 저장되어 있던 퀘스트 진행도를 화면에 보여주기 좋은 형태로 정리한다.
// (날짜/주가 바뀌었으면 화면에는 0부터 보이도록 초기화하되, 실제 저장은 다음 flush 시점에 이루어진다)
export function normalizeQuests(quests) {
  const todayKey = getCurrentDailyDateKey();
  const weekKey = getCurrentWeekKey();
  const current = quests ?? {};
  return {
    dailyDateKey: todayKey,
    daily: current.dailyDateKey === todayKey ? { ...emptyDaily, ...current.daily } : { ...emptyDaily },
    weeklyWeekKey: weekKey,
    weekly: current.weeklyWeekKey === weekKey ? { ...emptyWeekly, ...current.weekly } : { ...emptyWeekly },
    guildWeeklyClaimedWeekKey: current.guildWeeklyClaimedWeekKey ?? null,
  };
}

// 기존 진행도에 변화량(deltas)을 더한 새 퀘스트 진행도를 만든다. 저장 시점마다 이 함수로 병합해서 쓴다.
export function applyQuestDeltas(quests, deltas = {}) {
  const normalized = normalizeQuests(quests);
  const daily = { ...normalized.daily };
  const weekly = { ...normalized.weekly };

  if (deltas.kills) daily.kills += deltas.kills;
  if (deltas.cheers) daily.cheers += deltas.cheers;
  if (deltas.enhances) daily.enhances += deltas.enhances;
  if (deltas.regionBossClears) weekly.regionBossClears += deltas.regionBossClears;
  if (deltas.dailyBoxClaimed) daily.boxClaimed = true;
  if (deltas.weeklyClaimId) weekly.claimedIds = [...weekly.claimedIds, deltas.weeklyClaimId];
  if (deltas.guildWeeklyClaimedWeekKey) normalized.guildWeeklyClaimedWeekKey = deltas.guildWeeklyClaimedWeekKey;

  return { ...normalized, daily, weekly };
}
