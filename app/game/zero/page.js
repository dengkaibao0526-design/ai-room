import KBZeroGame from "./KBZeroGame";
import ZeroMultiplayer from "./ZeroMultiplayer";
import "./zero.css";

export const metadata = {
  title: "KB ZERO · 小KB",
  description: "小KB实验性高刷新 FPS 训练场。",
};

export default function KBZeroPage() {
  return (
    <>
      <KBZeroGame />
      <ZeroMultiplayer />
    </>
  );
}
