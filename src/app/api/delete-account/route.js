import { createClient } from "@supabase/supabase-js";

// 이 파일은 서버에서만 실행된다 (브라우저에는 절대 내려가지 않음).
// service_role 키를 여기서만 사용해서, 요청을 보낸 본인 계정만 삭제한다.
export async function POST(request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // 1) 토큰이 실제로 로그인된 사람의 것인지 확인
  const authClient = createClient(supabaseUrl, anonKey);
  const { data: userData, error: userError } = await authClient.auth.getUser(token);
  if (userError || !userData?.user) {
    return Response.json({ error: "인증에 실패했습니다." }, { status: 401 });
  }

  // 2) 관리자 권한으로 그 사람의 계정만 삭제 (characters 표는 on delete cascade로 함께 삭제됨)
  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(userData.user.id);
  if (deleteError) {
    return Response.json({ error: "탈퇴 처리에 실패했습니다." }, { status: 500 });
  }

  return Response.json({ success: true });
}
