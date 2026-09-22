// 이 브라우저(기기)가 "내 로그인"이라고 기억해두는 값. 다른 곳에서 로그인하면
// 서버에 저장된 값이 바뀌고, 그러면 이 값과 더 이상 일치하지 않게 되어 밀려난 걸 알 수 있다.
const STORAGE_KEY = "adventurer-guild-session-id";

export function getMySessionId() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setMySessionId(id) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // 시크릿 모드 등 localStorage를 못 쓰는 환경이면 그냥 넘어간다.
  }
}

export function createSessionId() {
  return crypto.randomUUID();
}
