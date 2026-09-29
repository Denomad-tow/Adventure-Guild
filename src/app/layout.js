import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import AuthGate from "@/components/AuthGate";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "모험가 길드",
  description: "협동 방치형 판타지 RPG",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "모험가 길드",
  },
  icons: {
    apple: "/apple-icon.png",
  },
};

// 휴대폰 화면 배율/확대 방지 + 상태바 색을 앱과 맞춰서, 홈 화면에 추가했을 때 진짜 앱처럼 보이게 한다.
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#4c1d95",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <AuthGate>{children}</AuthGate>
        </AuthProvider>
      </body>
    </html>
  );
}
