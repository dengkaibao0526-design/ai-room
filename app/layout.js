import "./globals.css";

export const metadata = {
  title: "小KB房间",
  description: "进来坐会儿，和小KB聊聊天。",
};
export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
