import "./globals.css";

export const metadata = {
  title: "AI 分身舱",
  description: "KB的 AI 分身个人网站"
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
