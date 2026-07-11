import "./globals.css";
import "./premium.css";
import "./visual-polish.css";
import "./mobile-polish.css";
import "./mobile-back-button.css";
import "./mobile-motion.css";
import "./typing-energy.css";
import "./desktop-spatial-field.css";
import "./mobile-spatial-sensor.css";
import "./mobile-spatial-grand-field.css";
import "./kb-core-state.css";
import "./ai-breathing.css";
import "./memory-center.css";
import "./install-webclip.css";
import DesktopCursorEffect from "../components/DesktopCursorEffect";
import ProductEntrance from "../components/ProductEntrance";
import MobileSpatialSensor from "../components/MobileSpatialSensor";
import AIBreathEngine from "../components/AIBreathEngine";
import MemoryCenter from "../components/MemoryCenter";
import MemoryRequestBridge from "../components/MemoryRequestBridge";
import AppleInstallPrompt from "../components/AppleInstallPrompt";

export const metadata = {
  title: "万能的KB",
  description: "进来坐会儿，和小KB聊聊天。",
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "小KB",
    statusBarStyle: "black-translucent",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>
        {children}
        <ProductEntrance />
        <DesktopCursorEffect />
        <MobileSpatialSensor />
        <AIBreathEngine />
        <MemoryRequestBridge />
        <MemoryCenter />
        <AppleInstallPrompt />
      </body>
    </html>
  );
}
