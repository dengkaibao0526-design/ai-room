import "./globals.css";
import DesktopCursorEffect from "../components/DesktopCursorEffect";

export const metadata = {
  title: "万能的KB",
  description: "进来坐会儿，和小KB聊聊天。",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>
        {children}
        <DesktopCursorEffect />
      </body>
    </html>
  );
}
