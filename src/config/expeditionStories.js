// 원정대가 돌아왔을 때 보여주는 짧은 이야기 한 줄. 자유롭게 추가해도 된다.
export const expeditionSuccessStories = [
  "원정대가 콧노래를 부르며 돌아왔다.",
  "예상보다 수확이 좋아 다들 싱글벙글이다.",
  "길을 잃을 뻔했지만 무사히 임무를 마쳤다.",
  "돌아오는 길에 산딸기를 잔뜩 주워왔다.",
  "몬스터 몇 마리와 마주쳤지만 가볍게 따돌렸다.",
  "예정보다 조금 늦었지만 다치지 않고 돌아왔다.",
];

export const expeditionFailureStories = [
  "궂은 날씨 탓에 예정보다 성과가 적었다.",
  "길을 잘못 들어 헤매다 겨우 돌아왔다.",
  "몬스터에게 쫓겨 짐을 반쯤 버리고 도망쳤다.",
  "다들 지쳐서 일찍 돌아왔다. 다음엔 더 잘할 거라고.",
  "장비가 말썽을 부려 수확이 신통치 않았다.",
];

export function pickExpeditionStory(success) {
  const pool = success ? expeditionSuccessStories : expeditionFailureStories;
  return pool[Math.floor(Math.random() * pool.length)];
}
