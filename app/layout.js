import "./globals.css";
import "./premium.css";
import "./visual-polish.css";
import "./mobile-polish.css";
import "./mobile-back-button.css";
import "./mobile-motion.css";
import DesktopCursorEffect from "../components/DesktopCursorEffect";
import ProductEntrance from "../components/ProductEntrance";

export const metadata = {
  title: "万能的KB",
  description: "进来坐会儿，和小KB聊聊天。",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>
        {children}
        <ProductEntrance />
        <DesktopCursorEffect />
      </body>
    </html>
  );
}
