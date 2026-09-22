"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getJob } from "@/config/jobs";
import { supabase } from "@/lib/supabaseClient";
import { formatNumber } from "@/lib/format";
import { fetchEquippedBonuses } from "@/lib/equipmentBonuses";
import {
  getJobSkills,
  getSkillEnhanceCost,
  getSkillMultiplier,
  getSkillEnhanceSuccessRate,
  rollSkillEnhanceSuccess,
  maxSkillLevel,
  skillEnhanceFailureStartLevel,
} from "@/config/skills";
import {
  traitBranches,
  traitStartLevel,
  traitResetCost,
  getTotalTraitPoints,
  getUsedTraitPoints,
} from "@/config/traits";
import {
  getTotalAttack,
  getEnhanceAttackBonus,
  getEnhanceTotalCost,
  enhanceBatchOptions,
} from "@/config/balance";
import { applyQuestDeltas } from "@/lib/quests";
import { advancedClassLevel, getAdvancedClasses, getAdvancedClass } from "@/config/advancedClasses";

export default function GrowthPage() {
  const { character, refreshCharacter } = useAuth();
  const job = character ? getJob(character.job) : null;
  const [count, setCount] = useState(enhanceBatchOptions[0]);
  const [enhancing, setEnhancing] = useState(false);
  const [equipAttackBonus, setEquipAttackBonus] = useState(0);
  const [traitBusy, setTraitBusy] = useState(false);
  const [skillBusyId, setSkillBusyId] = useState(null);
  const [skillEnhanceResult, setSkillEnhanceResult] = useState(null);
  const [advancedClassBusy, setAdvancedClassBusy] = useState(false);
  const enhancingRef = useRef(false);

  // 탭을 급하게 오갈 때 골드가 옛날 값으로 보이는 걸 줄이기 위해,
  // 이 탭에 들어올 때마다 캐릭터 정보를 한 번 더 최신으로 받아온다.
  useEffect(() => {
    refreshCharacter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (character?.user_id) {
      fetchEquippedBonuses(character.user_id)
        .then((bonuses) => setEquipAttackBonus(bonuses.attackFlat))
        .catch(() => setEquipAttackBonus(0));
    }
  }, [character?.user_id]);

  if (!character || !job) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center text-sm text-zinc-400">
        캐릭터 정보를 불러오는 중...
      </div>
    );
  }

  const progress = character.progress ?? {};
  const gold = progress.gold ?? 0;
  const enhanceLevel = progress.enhanceLevel ?? 0;
  const totalCost = getEnhanceTotalCost(enhanceLevel, count);
  const currentAttack = getTotalAttack(character.job, character.level, enhanceLevel) + equipAttackBonus;
  const nextAttack = getTotalAttack(character.job, character.level, enhanceLevel + count) + equipAttackBonus;
  const canAfford = gold >= totalCost;
  const skills = getJobSkills(character.job);
  const stones = progress.enhancementStones ?? 0;
  const skillLevels = progress.skillLevels ?? {};

  const traits = progress.traits ?? { attack: 0, survival: 0, luck: 0 };
  const totalTraitPoints = getTotalTraitPoints(character.level);
  const usedTraitPoints = getUsedTraitPoints(traits);
  const availableTraitPoints = totalTraitPoints - usedTraitPoints;

  const advancedClassOptions = getAdvancedClasses(character.job);
  const chosenAdvancedClass = progress.advancedClass
    ? getAdvancedClass(character.job, progress.advancedClass)
    : null;

  async function handleEnhance() {
    // 응답이 오기 전에 버튼이 한 번 더 눌리는 걸 확실히 막는다 (ref는 즉시 반영되어 중복 클릭에 안전함).
    if (enhancingRef.current || !canAfford) return;
    enhancingRef.current = true;
    setEnhancing(true);

    await supabase
      .from("characters")
      .update({
        progress: {
          ...progress,
          gold: gold - totalCost,
          enhanceLevel: enhanceLevel + count,
          quests: applyQuestDeltas(progress.quests, { enhances: 1 }),
        },
      })
      .eq("user_id", character.user_id);

    await refreshCharacter();
    enhancingRef.current = false;
    setEnhancing(false);
  }

  async function handleAddTraitPoint(branchId, amount) {
    if (traitBusy || availableTraitPoints <= 0) return;
    const pointsToAdd = Math.min(amount, availableTraitPoints);
    setTraitBusy(true);
    const nextTraits = { ...traits, [branchId]: (traits[branchId] ?? 0) + pointsToAdd };
    await supabase
      .from("characters")
      .update({ progress: { ...progress, traits: nextTraits } })
      .eq("user_id", character.user_id);
    await refreshCharacter();
    setTraitBusy(false);
  }

  async function handleEnhanceSkill(skillId) {
    const currentLevel = skillLevels[skillId] ?? 0;
    const cost = getSkillEnhanceCost(currentLevel);
    if (skillBusyId || currentLevel >= maxSkillLevel || stones < cost) return;
    setSkillBusyId(skillId);
    setSkillEnhanceResult(null);

    const success = rollSkillEnhanceSuccess(currentLevel);
    const nextSkillLevels = success
      ? { ...skillLevels, [skillId]: currentLevel + 1 }
      : skillLevels;

    await supabase
      .from("characters")
      .update({
        progress: { ...progress, enhancementStones: stones - cost, skillLevels: nextSkillLevels },
      })
      .eq("user_id", character.user_id);
    await refreshCharacter();
    setSkillBusyId(null);
    setSkillEnhanceResult({ skillId, success });
    setTimeout(() => setSkillEnhanceResult(null), 2000);
  }

  async function handleChooseAdvancedClass(classId) {
    if (advancedClassBusy || progress.advancedClass) return;
    setAdvancedClassBusy(true);
    await supabase
      .from("characters")
      .update({ progress: { ...progress, advancedClass: classId } })
      .eq("user_id", character.user_id);
    await refreshCharacter();
    setAdvancedClassBusy(false);
  }

  async function handleResetTraits() {
    if (traitBusy || usedTraitPoints === 0 || gold < traitResetCost) return;
    setTraitBusy(true);
    await supabase
      .from("characters")
      .update({
        progress: {
          ...progress,
          gold: gold - traitResetCost,
          traits: { attack: 0, survival: 0, luck: 0 },
        },
      })
      .eq("user_id", character.user_id);
    await refreshCharacter();
    setTraitBusy(false);
  }

  return (
    <div className="flex flex-col gap-6 px-6 py-8">
      <div className="flex items-center gap-3">
        <span className="text-3xl">{job.emoji}</span>
        <div>
          <p className="font-semibold text-zinc-950 dark:text-white">
            {character.nickname} · Lv.{character.level}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {chosenAdvancedClass ? `${job.label} · ${chosenAdvancedClass.name}` : job.label} · 강화 +{enhanceLevel}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">공격력 강화</h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          골드를 써서 공격력을 영구적으로 올립니다. 강화할수록 다음 비용이 비싸집니다.
        </p>

        <div className="mt-4 flex rounded-lg bg-zinc-100 p-1 dark:bg-zinc-900">
          {enhanceBatchOptions.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setCount(option)}
              className={`flex-1 rounded-md py-2 text-sm font-medium ${
                count === option
                  ? "bg-white text-zinc-950 shadow dark:bg-zinc-800 dark:text-white"
                  : "text-zinc-500"
              }`}
            >
              {option}강화
            </button>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between rounded-lg bg-zinc-100 px-4 py-3 text-sm dark:bg-zinc-900">
          <span className="text-zinc-500 dark:text-zinc-400">현재 공격력</span>
          <span className="font-semibold text-zinc-950 dark:text-white">
            {formatNumber(currentAttack)}
            <span className="ml-1 text-xs font-normal text-emerald-500">
              (강화 +{formatNumber(getEnhanceAttackBonus(enhanceLevel))})
            </span>
            {equipAttackBonus > 0 && (
              <span className="ml-1 text-xs font-normal text-sky-500">
                (장비 +{formatNumber(equipAttackBonus)})
              </span>
            )}
          </span>
        </div>

        <div className="mt-2 flex items-center justify-between rounded-lg bg-zinc-100 px-4 py-3 text-sm dark:bg-zinc-900">
          <span className="text-zinc-500 dark:text-zinc-400">{count}강화하면</span>
          <span className="font-semibold text-sky-500">{formatNumber(nextAttack)}</span>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-zinc-500 dark:text-zinc-400">보유 골드</span>
          <span className="font-semibold text-amber-500">{formatNumber(gold)} G</span>
        </div>

        <button
          type="button"
          onClick={handleEnhance}
          disabled={enhancing || !canAfford}
          className="mt-4 w-full rounded-lg bg-zinc-950 py-3 text-sm font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-zinc-950"
        >
          {enhancing ? "강화 중..." : `${formatNumber(totalCost)} G로 ${count}강화하기`}
        </button>

        {!canAfford && (
          <p className="mt-2 text-center text-sm text-red-500">
            골드가 부족합니다. (필요: {formatNumber(totalCost)} G)
          </p>
        )}
      </div>

      {/* 자동 발동 스킬 (전투 중 쿨타임마다 저절로 발동됨) */}
      <div className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">자동 발동 스킬</h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          모험 중 쿨타임마다 저절로 발동됩니다. 공격력이 오르면 스킬 피해도 같이 강해집니다.
        </p>
        <p className="mt-2 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <span>보유 강화석</span>
          <span className="font-semibold text-zinc-950 dark:text-white">🔩 {formatNumber(stones)}</span>
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {skills.map((skill) => {
            const level = skillLevels[skill.id] ?? 0;
            const cost = getSkillEnhanceCost(level);
            const isMax = level >= maxSkillLevel;
            const showSuccessRate = level >= skillEnhanceFailureStartLevel;
            const result = skillEnhanceResult?.skillId === skill.id ? skillEnhanceResult : null;
            return (
              <div key={skill.id} className="rounded-lg bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-900">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-950 dark:text-white">
                    {skill.emoji} {skill.name}
                    {level > 0 && <span className="ml-1 text-sky-500">+{level}</span>}
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    쿨타임 {skill.cooldown}초 · 공격력 ×{getSkillMultiplier(skill, level).toFixed(2)}
                  </span>
                </div>
                {showSuccessRate && !isMax && (
                  <p className="mt-1 text-right text-[11px] text-red-500">
                    성공률 {Math.round(getSkillEnhanceSuccessRate(level) * 100)}%
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => handleEnhanceSkill(skill.id)}
                  disabled={skillBusyId === skill.id || isMax || stones < cost}
                  className="mt-2 w-full rounded-lg border border-zinc-300 py-1.5 text-xs font-medium text-zinc-700 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300"
                >
                  {isMax ? "최대 강화" : `강화하기 (🔩${cost})`}
                </button>
                {result && (
                  <p
                    className={`mt-1 text-center text-xs font-semibold ${
                      result.success ? "text-emerald-500" : "text-red-500"
                    }`}
                  >
                    {result.success ? "강화 성공!" : "강화 실패... 강화석만 소모되었습니다."}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 특성 트리 */}
      <div className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">특성</h2>
        {character.level < traitStartLevel ? (
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            레벨 {traitStartLevel}부터 특성 포인트를 얻습니다. (현재 Lv.{character.level})
          </p>
        ) : (
          <>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              남은 포인트: {availableTraitPoints} / {totalTraitPoints}
            </p>
            <div className="mt-3 flex flex-col gap-2">
              {traitBranches.map((branch) => (
                <div
                  key={branch.id}
                  className="flex items-center justify-between rounded-lg bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-900"
                >
                  <div>
                    <p className="text-zinc-950 dark:text-white">
                      {branch.emoji} {branch.label}{" "}
                      <span className="font-semibold text-sky-500">{traits[branch.id] ?? 0}</span>
                    </p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{branch.description}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleAddTraitPoint(branch.id, 1)}
                      disabled={traitBusy || availableTraitPoints <= 0}
                      className="rounded-lg bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-zinc-950"
                    >
                      +1
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddTraitPoint(branch.id, 10)}
                      disabled={traitBusy || availableTraitPoints <= 0}
                      className="rounded-lg bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-zinc-950"
                    >
                      +10
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={handleResetTraits}
              disabled={traitBusy || usedTraitPoints === 0 || gold < traitResetCost}
              className="mt-3 w-full rounded-lg border border-zinc-300 py-2 text-xs font-medium text-zinc-700 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300"
            >
              특성 초기화 ({formatNumber(traitResetCost)} G)
            </button>
          </>
        )}
      </div>

      {/* 전직 */}
      <div className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">전직</h2>
        {character.level < advancedClassLevel ? (
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            레벨 {advancedClassLevel}부터 전직할 수 있습니다. (현재 Lv.{character.level})
          </p>
        ) : chosenAdvancedClass ? (
          <div className="mt-2 rounded-lg bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-900">
            <p className="font-semibold text-emerald-500">{chosenAdvancedClass.name}</p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{chosenAdvancedClass.description}</p>
          </div>
        ) : (
          <>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              한 번 고르면 환생하기 전까지 바꿀 수 없습니다. 신중하게 골라주세요.
            </p>
            <div className="mt-3 flex flex-col gap-2">
              {advancedClassOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleChooseAdvancedClass(option.id)}
                  disabled={advancedClassBusy}
                  className="rounded-lg border border-zinc-300 px-3 py-2.5 text-left text-sm disabled:opacity-40 dark:border-zinc-700"
                >
                  <span className="font-semibold text-zinc-950 dark:text-white">{option.name}</span>
                  <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">{option.description}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <p className="text-center text-xs text-zinc-400 dark:text-zinc-500">
        환생은 다음 단계들에서 추가될 예정입니다.
      </p>
    </div>
  );
}
