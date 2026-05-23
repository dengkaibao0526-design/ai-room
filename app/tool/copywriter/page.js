"use client";

import { useMemo, useState } from "react";

const PLATFORM_OPTIONS = [
  { value: "moments", label: "朋友圈", desc: "熟人关系，自然一点" },
  { value: "xiaohongshu", label: "小红书", desc: "有标题感和分享感" },
  { value: "qq", label: "QQ空间", desc: "轻松、学生感、随意" },
  { value: "comment", label: "评论区", desc: "短句回复，不越界" },
  { value: "caption", label: "图片配文", desc: "适合照片氛围" },
  { value: "blessing", label: "祝福文案", desc: "真诚，不模板" },
];

const STYLE_OPTIONS = [
  { value: "natural", label: "自然朋友圈", desc: "像真人随手发" },
  { value: "kb", label: "小KB风", desc: "干净、温和、少年感" },
  { value: "premium", label: "高级感", desc: "克制、有质感" },
  { value: "funny", label: "轻松搞笑", desc: "有点幽默，不尬" },
  { value: "cool", label: "有点拽", desc: "不油、不装" },
  { value: "icebear", label: "白熊风", desc: "冷静、话少、可靠" },
  { value: "romantic", label: "暧昧恋爱", desc: "有分寸，不太满" },
  { value: "birthday", label: "生日祝福", desc: "真诚、不老套" },
];

const LENGTH_OPTIONS = [
  { value: "tiny", label: "极短", desc: "8-18 字左右" },
  { value: "short", label: "短", desc: "1-2 句话" },
  { value: "medium", label: "中等", desc: "2-4 句话" },
  { value: "long", label: "稍长", desc: "4-6 句话" },
];

const INTENSITY_OPTIONS = [
  { value: "low", label: "低调", desc: "克制一点" },
  { value: "normal", label: "正常", desc: "自然刚好" },
  { value: "high", label: "明显", desc: "情绪更足" },
  { value: "meme", label: "有梗", desc: "轻松整活" },
];

const EMOJI_OPTIONS = [
  { value: "none", label: "不要 emoji" },
  { value: "light", label: "少量 emoji" },
  { value: "more", label: "多一点 emoji" },
];

const EXAMPLE_CONTENTS = [
  "今天和朋友出去吃饭，拍了几张照片，想发朋友圈，不想太刻意。",
  "我买了一束花，想发一条有点高级感但不装的文案。",
  "朋友生日，想写一句真诚一点的祝福，不要太模板。",
  "想评论朋友发的猫猫照片，语气像白熊 Ice Bear。",
];

export default function CopywriterPage() {
  const [content, setContent] = useState("");
  const [scene, setScene] = useState("");
  const [avoid, setAvoid] = useState("不要油腻，不要像营销号，不要太 AI");
  const [platform, setPlatform] = useState("moments");
  const [style, setStyle] = useState("natural");
  const [length, setLength] = useState("medium");
  const [intensity, setIntensity] = useState("normal");
  const [emojiMode, setEmojiMode] = useState("none");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const canSubmit = content.trim().length > 0 && !loading;

  const selectedSummary = useMemo(() => {
    const platformLabel =
      PLATFORM_OPTIONS.find((item) => item.value === platform)?.label ||
      "朋友圈";
    const styleLabel =
      STYLE_OPTIONS.find((item) => item.value === style)?.label ||
      "自然朋友圈";
    const lengthLabel =
      LENGTH_OPTIONS.find((item) => item.value === length)?.label || "中等";
    const intensityLabel =
      INTENSITY_OPTIONS.find((item) => item.value === intensity)?.label ||
      "正常";
    const emojiLabel =
      EMOJI_OPTIONS.find((item) => item.value === emojiMode)?.label ||
      "不要 emoji";

    return `${platformLabel} · ${styleLabel} · ${lengthLabel} · ${intensityLabel} · ${emojiLabel}`;
  }, [platform, style, length, intensity, emojiMode]);

  async function generateCopy() {
    if (!content.trim() || loading) return;

    setLoading(true);
    setError("");
    setCopied(false);
    setResult("");

    try {
      const res = await fetch("/api/tools/copywriter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content,
          scene,
          avoid,
          platform,
          style,
          length,
          intensity,
          emojiMode,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "生成失败");
      }

      setResult(data.result || "");
    } catch (err) {
      console.error("COPYWRITER_PAGE_ERROR:", err);
      setError(err.message || "生成失败了，等下再试一下。");
    } finally {
      setLoading(false);
    }
  }

  async function copyResult() {
    if (!result) return;

    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
    } catch {
      setCopied(false);
      alert("复制失败，可以手动长按结果复制。");
    }
  }

  function resetAll() {
    setContent("");
    setScene("");
    setAvoid("不要油腻，不要像营销号，不要太 AI");
    setPlatform("moments");
    setStyle("natural");
    setLength("medium");
    setIntensity("normal");
    setEmojiMode("none");
    setResult("");
    setError("");
    setCopied(false);
  }

  return (
    <main className="copyPage">
      <section className="copyShell">
        <header className="copyHero">
          <div className="copyBadge">XIAOKB TOOL · COPYWRITER PRO</div>

          <h1>
            小KB
            <br />
            文案工作台
          </h1>

          <p>
            不是那种油油的 AI 文案。这里主要帮你写朋友圈、小红书、评论区、祝福和图片配文。
            重点是自然、有分寸、像真人。
          </p>

          <div className="heroMeta">
            <span>{selectedSummary}</span>
          </div>
        </header>

        <section className="copyGrid">
          <div className="controlPanel">
            <PanelTitle
              title="你想发什么？"
              desc="把事情说清楚就行，不用自己组织得很漂亮。"
            />

            <textarea
              className="mainTextarea"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="比如：今天和朋友出去吃饭，拍了几张照片，想发朋友圈，不想太刻意..."
              maxLength={5000}
            />

            <div className="exampleRow">
              {EXAMPLE_CONTENTS.map((item) => (
                <button key={item} onClick={() => setContent(item)}>
                  {item}
                </button>
              ))}
            </div>

            <PanelTitle
              title="使用场景"
              desc="可不填。比如：发朋友圈、评论朋友、生日祝福、配自拍。"
            />

            <input
              className="softInput"
              value={scene}
              onChange={(e) => setScene(e.target.value)}
              placeholder="补充场景，可不填"
              maxLength={500}
            />

            <PanelTitle
              title="不想要什么？"
              desc="这个很关键。你讨厌什么风格就写进去。"
            />

            <input
              className="softInput"
              value={avoid}
              onChange={(e) => setAvoid(e.target.value)}
              placeholder="比如：不要油腻，不要太舔，不要装，不要营销号"
              maxLength={1000}
            />

            <PanelTitle title="发在哪里？" />

            <OptionGrid
              options={PLATFORM_OPTIONS}
              value={platform}
              onChange={setPlatform}
            />

            <PanelTitle title="想要什么风格？" />

            <OptionGrid
              options={STYLE_OPTIONS}
              value={style}
              onChange={setStyle}
            />

            <div className="miniGrid">
              <div>
                <PanelTitle title="长度" />
                <OptionGrid
                  compact
                  options={LENGTH_OPTIONS}
                  value={length}
                  onChange={setLength}
                />
              </div>

              <div>
                <PanelTitle title="情绪强度" />
                <OptionGrid
                  compact
                  options={INTENSITY_OPTIONS}
                  value={intensity}
                  onChange={setIntensity}
                />
              </div>
            </div>

            <PanelTitle title="Emoji" />

            <div className="emojiRow">
              {EMOJI_OPTIONS.map((item) => (
                <button
                  key={item.value}
                  className={emojiMode === item.value ? "activeChoice" : ""}
                  onClick={() => setEmojiMode(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="actionBar">
              <button
                className="primaryBtn"
                onClick={generateCopy}
                disabled={!canSubmit}
              >
                {loading ? "生成中..." : "生成文案"}
              </button>

              <button className="ghostBtn" onClick={resetAll} disabled={loading}>
                清空
              </button>
            </div>

            {error && <div className="errorBox">{error}</div>}
          </div>

          <div className="resultPanel">
            <div className="resultTop">
              <div>
                <div className="copyBadge small">RESULT</div>
                <h2>生成结果</h2>
                <p>可以直接复制，也可以挑一句自己再改一点。</p>
              </div>

              <button className="copyBtn" onClick={copyResult} disabled={!result}>
                {copied ? "已复制" : "复制"}
              </button>
            </div>

            {!result && !loading && (
              <div className="emptyState">
                <strong>还没有生成</strong>
                <span>左边填一下内容，点“生成文案”。</span>
              </div>
            )}

            {loading && (
              <div className="loadingState">
                <span></span>
                <span></span>
                <span></span>
                <p>小KB正在压低 AI 味...</p>
              </div>
            )}

            {result && <pre className="resultText">{result}</pre>}
          </div>
        </section>

        <footer className="copyFooter">
          <a href="/">回到小KB房间</a>
          <a href="/game/mbti">去测 MBTI</a>
        </footer>
      </section>

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
        }

        .copyPage {
          min-height: 100vh;
          color: white;
          background:
            radial-gradient(circle at 14% 0%, rgba(139, 92, 246, 0.36), transparent 34%),
            radial-gradient(circle at 100% 18%, rgba(236, 72, 153, 0.18), transparent 30%),
            linear-gradient(135deg, #03020a 0%, #090516 48%, #120720 100%);
          font-family:
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            "PingFang SC",
            "Microsoft YaHei",
            sans-serif;
        }

        .copyShell {
          width: min(1180px, 100%);
          margin: 0 auto;
          padding: 28px 18px 40px;
        }

        .copyHero,
        .controlPanel,
        .resultPanel {
          border-radius: 34px;
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.13), rgba(255, 255, 255, 0.045)),
            rgba(13, 10, 27, 0.82);
          border: 1px solid rgba(255, 255, 255, 0.13);
          box-shadow:
            0 34px 120px rgba(0, 0, 0, 0.34),
            0 0 80px rgba(139, 92, 246, 0.12);
          backdrop-filter: blur(26px);
        }

        .copyHero {
          position: relative;
          overflow: hidden;
          padding: 30px;
          margin-bottom: 16px;
        }

        .copyHero::after {
          content: "";
          position: absolute;
          width: 260px;
          height: 260px;
          right: -80px;
          top: -100px;
          border-radius: 999px;
          background: rgba(168, 85, 247, 0.28);
          filter: blur(18px);
        }

        .copyBadge {
          position: relative;
          z-index: 1;
          width: fit-content;
          padding: 7px 11px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.14em;
          color: rgba(233, 213, 255, 0.95);
          background: rgba(139, 92, 246, 0.16);
          border: 1px solid rgba(216, 180, 254, 0.18);
        }

        .copyBadge.small {
          font-size: 9px;
          padding: 6px 10px;
        }

        .copyHero h1 {
          position: relative;
          z-index: 1;
          margin: 18px 0 0;
          font-size: clamp(44px, 8vw, 82px);
          line-height: 0.92;
          letter-spacing: -0.09em;
        }

        .copyHero p {
          position: relative;
          z-index: 1;
          width: min(720px, 100%);
          margin: 18px 0 0;
          color: rgba(226, 232, 240, 0.68);
          line-height: 1.75;
          font-size: 15px;
        }

        .heroMeta {
          position: relative;
          z-index: 1;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 18px;
        }

        .heroMeta span {
          padding: 8px 11px;
          border-radius: 999px;
          color: rgba(233, 213, 255, 0.9);
          background: rgba(139, 92, 246, 0.13);
          border: 1px solid rgba(216, 180, 254, 0.15);
          font-size: 12px;
        }

        .copyGrid {
          display: grid;
          grid-template-columns: minmax(0, 1.05fr) minmax(360px, 0.95fr);
          gap: 16px;
          align-items: start;
        }

        .controlPanel,
        .resultPanel {
          padding: 22px;
        }

        .resultPanel {
          position: sticky;
          top: 18px;
          min-height: 620px;
        }

        .panelTitle {
          margin: 20px 0 10px;
        }

        .panelTitle.first {
          margin-top: 0;
        }

        .panelTitle h2 {
          margin: 0;
          font-size: 17px;
          letter-spacing: -0.04em;
        }

        .panelTitle p {
          margin: 6px 0 0;
          color: rgba(226, 232, 240, 0.5);
          font-size: 12.5px;
          line-height: 1.5;
        }

        .mainTextarea,
        .softInput {
          width: 100%;
          outline: none;
          color: white;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition:
            border-color 0.18s ease,
            box-shadow 0.18s ease,
            background 0.18s ease;
        }

        .mainTextarea {
          min-height: 160px;
          resize: vertical;
          padding: 15px;
          border-radius: 20px;
          font-size: 14.5px;
          line-height: 1.65;
        }

        .softInput {
          height: 48px;
          padding: 0 14px;
          border-radius: 16px;
          font-size: 14px;
        }

        .mainTextarea:focus,
        .softInput:focus {
          border-color: rgba(216, 180, 254, 0.38);
          background: rgba(255, 255, 255, 0.075);
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.12);
        }

        .mainTextarea::placeholder,
        .softInput::placeholder {
          color: rgba(255, 255, 255, 0.35);
        }

        .exampleRow {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 10px;
        }

        .exampleRow button,
        .choiceBtn,
        .emojiRow button {
          cursor: pointer;
          color: rgba(255, 255, 255, 0.82);
          background: rgba(255, 255, 255, 0.055);
          border: 1px solid rgba(255, 255, 255, 0.085);
          transition:
            transform 0.18s ease,
            background 0.18s ease,
            border-color 0.18s ease;
        }

        .exampleRow button {
          padding: 8px 10px;
          border-radius: 999px;
          font-size: 12px;
        }

        .optionGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 9px;
        }

        .optionGrid.compactGrid {
          grid-template-columns: 1fr;
        }

        .choiceBtn {
          min-height: 64px;
          padding: 12px;
          border-radius: 18px;
          text-align: left;
        }

        .choiceBtn strong {
          display: block;
          font-size: 13px;
          margin-bottom: 5px;
        }

        .choiceBtn span {
          display: block;
          font-size: 11.5px;
          line-height: 1.4;
          color: rgba(226, 232, 240, 0.46);
        }

        .exampleRow button:hover,
        .choiceBtn:hover,
        .emojiRow button:hover {
          transform: translateY(-1px);
          background: rgba(139, 92, 246, 0.15);
          border-color: rgba(216, 180, 254, 0.22);
        }

        .activeChoice {
          background:
            radial-gradient(circle at 18% 0%, rgba(216, 180, 254, 0.2), transparent 40%),
            linear-gradient(135deg, rgba(139, 92, 246, 0.26), rgba(236, 72, 153, 0.1)) !important;
          border-color: rgba(216, 180, 254, 0.4) !important;
          box-shadow: 0 12px 34px rgba(139, 92, 246, 0.12);
        }

        .miniGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .emojiRow {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 9px;
        }

        .emojiRow button {
          min-height: 44px;
          border-radius: 16px;
          font-weight: 800;
          font-size: 12.5px;
        }

        .actionBar {
          display: grid !important;
          grid-template-columns: 1fr !important;
          gap: 12px !important;
          margin-top: 24px !important;
        }

        .primaryBtn,
        .ghostBtn,
        .copyBtn {
          border: 0;
          cursor: pointer;
          color: white;
          font-weight: 900;
        }

        .primaryBtn {
          width: 100% !important;
          min-height: 58px !important;
          height: 58px !important;
          padding: 0 20px !important;
          border-radius: 20px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-size: 16px !important;
          font-weight: 950 !important;
          line-height: 1 !important;
          color: white !important;
          background:
            radial-gradient(circle at 30% 0%, rgba(255, 255, 255, 0.28), transparent 34%),
            linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%) !important;
          box-shadow:
            0 18px 42px rgba(139, 92, 246, 0.34),
            0 0 28px rgba(217, 70, 239, 0.16),
            inset 0 1px 0 rgba(255, 255, 255, 0.2) !important;
        }

        .ghostBtn {
          width: 100% !important;
          min-height: 52px !important;
          height: 52px !important;
          border-radius: 20px !important;
          font-size: 15px !important;
          font-weight: 900 !important;
          background: rgba(255, 255, 255, 0.075);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .copyBtn {
          height: 48px;
          padding: 0 18px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.075);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .primaryBtn:disabled,
        .ghostBtn:disabled,
        .copyBtn:disabled {
          opacity: 0.55 !important;
          cursor: not-allowed !important;
          box-shadow: none !important;
          transform: none !important;
        }

        .errorBox {
          margin-top: 12px;
          padding: 13px;
          border-radius: 16px;
          color: rgba(254, 202, 202, 0.96);
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(248, 113, 113, 0.18);
          font-size: 13px;
        }

        .resultTop {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 16px;
        }

        .resultTop h2 {
          margin: 12px 0 0;
          font-size: 28px;
          letter-spacing: -0.06em;
        }

        .resultTop p {
          margin: 7px 0 0;
          color: rgba(226, 232, 240, 0.52);
          font-size: 13px;
        }

        .emptyState,
        .loadingState {
          min-height: 420px;
          display: grid;
          place-items: center;
          text-align: center;
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.045);
          border: 1px solid rgba(255, 255, 255, 0.075);
          color: rgba(226, 232, 240, 0.5);
        }

        .emptyState strong {
          display: block;
          font-size: 18px;
          color: rgba(255, 255, 255, 0.82);
          margin-bottom: 8px;
        }

        .emptyState span {
          font-size: 13px;
        }

        .loadingState {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .loadingState span {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: rgba(216, 180, 254, 0.86);
          animation: copyDot 1s infinite ease-in-out;
        }

        .loadingState span:nth-child(2) {
          animation-delay: 0.15s;
        }

        .loadingState span:nth-child(3) {
          animation-delay: 0.3s;
        }

        .loadingState p {
          margin: 8px 0 0;
          font-size: 13px;
        }

        .resultText {
          min-height: 420px;
          margin: 0;
          padding: 18px;
          border-radius: 24px;
          white-space: pre-wrap;
          word-break: break-word;
          color: rgba(226, 232, 240, 0.82);
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.08);
          font-family: inherit;
          font-size: 14px;
          line-height: 1.75;
        }

        .copyFooter {
          display: flex;
          justify-content: center;
          gap: 14px;
          margin-top: 22px;
        }

        .copyFooter a {
          color: rgba(226, 232, 240, 0.56);
          text-decoration: none;
          font-size: 13px;
        }

        @keyframes copyDot {
          0%,
          80%,
          100% {
            transform: translateY(0);
            opacity: 0.35;
          }

          40% {
            transform: translateY(-6px);
            opacity: 1;
          }
        }

        @media (max-width: 960px) {
          .copyGrid {
            grid-template-columns: 1fr;
          }

          .resultPanel {
            position: relative;
            top: auto;
            min-height: auto;
          }
        }

        @media (max-width: 640px) {
          .copyShell {
            padding: 16px 12px 34px;
          }

          .copyHero,
          .controlPanel,
          .resultPanel {
            border-radius: 28px;
            padding: 20px;
          }

          .copyHero h1 {
            font-size: 46px;
          }

          .optionGrid,
          .miniGrid,
          .emojiRow {
            grid-template-columns: 1fr;
          }

          .primaryBtn {
            min-height: 62px !important;
            height: 62px !important;
            font-size: 17px !important;
            border-radius: 22px !important;
          }

          .ghostBtn {
            min-height: 56px !important;
            height: 56px !important;
            border-radius: 22px !important;
          }

          .resultTop {
            flex-direction: column;
          }

          .copyBtn {
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}

function PanelTitle({ title, desc }) {
  return (
    <div className="panelTitle">
      <h2>{title}</h2>
      {desc && <p>{desc}</p>}
    </div>
  );
}

function OptionGrid({ options, value, onChange, compact = false }) {
  return (
    <div className={compact ? "optionGrid compactGrid" : "optionGrid"}>
      {options.map((item) => (
        <button
          key={item.value}
          className={
            value === item.value ? "choiceBtn activeChoice" : "choiceBtn"
          }
          onClick={() => onChange(item.value)}
        >
          <strong>{item.label}</strong>
          {item.desc && <span>{item.desc}</span>}
        </button>
      ))}
    </div>
  );
}
