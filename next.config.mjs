/** @type {import('next').NextConfig} */
const nextConfig = {
  // 휴대폰 등 같은 와이파이의 다른 기기에서 개발 서버에 접속할 때 필요한 설정
  allowedDevOrigins: ["192.168.68.64"],
};

export default nextConfig;
