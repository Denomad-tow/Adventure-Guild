// 지역 정보. 새 지역을 추가하려면 이 배열 끝에 항목을 하나 더 넣으면 된다.
export const regions = [
  {
    id: "forest",
    name: "초록 숲",
    element: "자연",
    monsters: [
      { name: "슬라임", emoji: "🟢" },
      { name: "고블린", emoji: "👺" },
      { name: "늑대", emoji: "🐺" },
    ],
    boss: { name: "고블린 족장", emoji: "👹" },
    clearStory: "고블린 족장을 쓰러뜨리자, 숲 너머로 향하는 낡은 갱도 입구가 드러났다.",
  },
  {
    id: "mine",
    name: "버려진 광산",
    element: "어둠",
    monsters: [
      { name: "박쥐", emoji: "🦇" },
      { name: "스켈레톤", emoji: "💀" },
      { name: "두더지 광부", emoji: "⛏️" },
    ],
    boss: { name: "해골 광산왕", emoji: "☠️" },
    clearStory: "해골 광산왕이 무너지며, 안개 자욱한 늪으로 이어지는 길이 열렸다.",
  },
  {
    id: "swamp",
    name: "안개 늪지",
    element: "물",
    monsters: [
      { name: "도마뱀 전사", emoji: "🦎" },
      { name: "늪 마녀", emoji: "🧙‍♀️" },
      { name: "거대 개구리", emoji: "🐸" },
    ],
    boss: { name: "늪의 마녀 모르가", emoji: "🧙" },
    clearStory: "늪의 마녀 모르가를 물리쳤다. 다음 이야기는 계속됩니다...",
  },
];
