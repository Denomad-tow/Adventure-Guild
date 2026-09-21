// 직업 4종 설정. 여기 값만 고치면 화면에 그대로 반영된다.
export const jobs = [
  {
    id: "warrior",
    label: "전사",
    emoji: "🗡️",
    description: "튼튼하고 안정적. 체력이 30% 이하가 되면 방어력이 2배가 된다.",
  },
  {
    id: "mage",
    label: "마법사",
    emoji: "🧙",
    description: "강한 광역 공격, 약한 몸. 스킬 피해 +20%.",
  },
  {
    id: "archer",
    label: "궁수",
    emoji: "🏹",
    description: "치명타(크리티컬) 특화. 치명타 확률 +10%.",
  },
  {
    id: "priest",
    label: "성직자",
    emoji: "✨",
    description: "균형형, 동료 강화. 내가 보낸 응원 효과 +50%.",
  },
];

export function getJob(jobId) {
  return jobs.find((job) => job.id === jobId);
}
