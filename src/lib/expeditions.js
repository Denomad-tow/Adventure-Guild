import { supabase } from "./supabaseClient";
import {
  expeditionCompanionSuccessBonusPercent,
  expeditionCompanionRewardBonusPercent,
  expeditionCompanionFeeGold,
  expeditionFailureRewardRatio,
} from "@/config/expeditions";
import { pickExpeditionStory } from "@/config/expeditionStories";

// 원정 결과(성공 여부, 보상, 이야기 한 줄)를 굴린다.
export function rollExpeditionResult(mission, hasCompanion) {
  const successRate = Math.min(1, mission.baseSuccessRate + (hasCompanion ? expeditionCompanionSuccessBonusPercent / 100 : 0));
  const success = Math.random() < successRate;

  const companionMultiplier = hasCompanion ? 1 + expeditionCompanionRewardBonusPercent / 100 : 1;
  const outcomeMultiplier = success ? 1 : expeditionFailureRewardRatio;
  const totalMultiplier = companionMultiplier * outcomeMultiplier;

  const gold = Math.round((mission.goldMin + Math.random() * (mission.goldMax - mission.goldMin)) * totalMultiplier);
  const stones = Math.round((mission.stoneMin + Math.random() * (mission.stoneMax - mission.stoneMin)) * totalMultiplier);

  return { success, gold, stones, storyLine: pickExpeditionStory(success) };
}

// 동행한 친구에게 즉시 사례금을 지급한다 (오프라인이어도 DB 트리거로 적용됨).
export async function payExpeditionCompanionFee(hirerId, hirerNickname, companion, missionId) {
  const { error } = await supabase.from("expedition_companions").insert({
    hirer_id: hirerId,
    hirer_nickname: hirerNickname,
    companion_id: companion.user_id,
    companion_nickname: companion.nickname,
    mission_id: missionId,
    fee_gold: expeditionCompanionFeeGold,
  });
  return { error };
}
