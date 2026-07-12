import KBZeroArena from "./KBZeroArena";
import "./zero.css";
import "./zero-multiplayer.css";

export const metadata = {
  title: "KB ZERO · 小KB",
  description: "小KB高刷新 FPS 训练场与实时 1v1 对战。",
};

export default function KBZeroPage() {
  return <KBZeroArena />;
}
