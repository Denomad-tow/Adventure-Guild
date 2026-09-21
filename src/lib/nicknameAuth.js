import { supabase } from "./supabaseClient";

// Supabase 로그인은 이메일이 필요하지만, 이 게임은 닉네임으로 가입/로그인한다.
// 그래서 닉네임을 화면에 보이지 않는 내부용 가짜 이메일로 바꿔서 사용한다.
// 같은 닉네임은 항상 같은 이메일이 되므로, 결과적으로 닉네임 중복도 막아준다.
function nicknameToEmail(nickname) {
  const bytes = new TextEncoder().encode(nickname.trim());
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `u${hex}@adventurer-guild.local`;
}

function toFriendlyError(error) {
  if (!error) return null;
  const message = error.message || "";
  if (message.includes("already registered")) {
    return "이미 사용 중인 닉네임입니다.";
  }
  if (message.includes("Password should be at least")) {
    return "비밀번호는 6자 이상이어야 합니다.";
  }
  if (message.includes("Invalid login credentials")) {
    return "닉네임 또는 비밀번호가 올바르지 않습니다.";
  }
  return "문제가 발생했습니다. 잠시 후 다시 시도해주세요.";
}

export async function signUpWithNickname({ nickname, password, jobId }) {
  const email = nicknameToEmail(nickname);
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    return { error: toFriendlyError(error) };
  }

  const { error: insertError } = await supabase.from("characters").insert({
    user_id: data.user.id,
    nickname: nickname.trim(),
    job: jobId,
  });
  if (insertError) {
    return { error: "캐릭터 저장에 실패했습니다. 다시 시도해주세요." };
  }

  return { error: null };
}

export async function signInWithNickname({ nickname, password }) {
  const email = nicknameToEmail(nickname);
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: toFriendlyError(error) };
  }
  return { error: null };
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function deleteAccount(password) {
  const { data } = await supabase.auth.getSession();
  const email = data.session?.user?.email;
  if (!email) {
    return { error: "로그인이 필요합니다." };
  }

  // 탈퇴는 되돌릴 수 없으므로, 비밀번호를 다시 확인해서 본인이 맞는지 한 번 더 검증한다.
  const { data: reAuthData, error: reAuthError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (reAuthError) {
    return { error: "비밀번호가 일치하지 않습니다." };
  }

  const token = reAuthData.session?.access_token;
  const res = await fetch("/api/delete-account", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json();
  if (!res.ok) {
    return { error: body.error || "탈퇴 처리에 실패했습니다." };
  }

  await supabase.auth.signOut();
  return { error: null };
}
