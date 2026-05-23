"use client";

import { useMemo, useState } from "react";

const QUESTIONS = [
  {
    id: 1,
    text: "周末突然空下来，你更想怎么过？",
    options: [
      { text: "约朋友出去走走，别一个人闷着", value: "E" },
      { text: "自己待会儿，充充电", value: "I" },
    ],
  },
  {
    id: 2,
    text: "遇到新朋友时，你通常是？",
    options: [
      { text: "能聊就聊，慢慢熟起来", value: "E" },
      { text: "先观察一下，对味了再开口", value: "I" },
    ],
  },
  {
    id: 3,
    text: "你更相信哪种判断？",
    options: [
      { text: "眼前事实和具体细节", value: "S" },
      { text: "直觉、感觉和背后的可能性", value: "N" },
    ],
  },
  {
    id: 4,
    text: "做决定时，你更常考虑？",
    options: [
      { text: "这件事合不合理、有没有逻辑", value: "T" },
      { text: "这件事会不会影响别人感受", value: "F" },
    ],
  },
  {
    id: 5,
    text: "你对计划的态度更像是？",
    options: [
      { text: "提前安排好，心里比较稳", value: "J" },
      { text: "留点空间，走一步看一步", value: "P" },
    ],
  },
  {
    id: 6,
    text: "朋友找你倾诉时，你更容易？",
    options: [
      { text: "帮他分析问题，找解决办法", value: "T" },
      { text: "先陪他站一会儿，别急着讲道理", value: "F" },
    ],
  },
  {
    id: 7,
    text: "你更喜欢哪种聊天？",
    options: [
      { text: "现实一点，聊具体发生了什么", value: "S" },
      { text: "发散一点，聊想法、意义、以后", value: "N" },
    ],
  },
  {
    id: 8,
    text: "在人多的地方待久了，你会？",
    options: [
      { text: "越聊越来劲", value: "E" },
      { text: "需要回去安静一下", value: "I" },
    ],
  },
  {
    id: 9,
    text: "面对任务，你更像？",
    options: [
      { text: "先列个顺序，按计划推进", value: "J" },
      { text: "先开始做，过程中慢慢调整", value: "P" },
    ],
  },
  {
    id: 10,
    text: "别人评价你，你更希望是？",
    options: [
      { text: "清醒、靠谱、有判断力", value: "T" },
      { text: "温柔、体贴、让人舒服", value: "F" },
    ],
  },
  {
    id: 11,
    text: "你更容易注意到？",
    options: [
      { text: "事情本身的细节和变化", value: "S" },
      { text: "事情背后的趋势和暗示", value: "N" },
    ],
  },
  {
    id: 12,
    text: "临时改变计划，你通常？",
    options: [
      { text: "会有点不舒服，想重新安排清楚", value: "J" },
      { text: "还行，反正也能随机应变", value: "P" },
    ],
  },
];

const RESULT_MAP = {
  INTJ: {
    title: "冷静规划型",
    vibe: "脑子很清醒，表面安静，心里有自己的路线图。",
    kb: "你不是不合群，是不想浪费能量。小KB觉得你挺稳，适合慢慢做大事。",
  },
  INTP: {
    title: "脑内宇宙型",
    vibe: "想法很多，喜欢拆逻辑，也容易突然陷入自己的世界。",
    kb: "你这脑子挺会跑。别人看你发呆，其实你可能已经推演三层了。",
  },
  ENTJ: {
    title: "目标推进型",
    vibe: "行动感强，喜欢把事情往前推，不太能忍受低效率。",
    kb: "你适合带队，但记得偶尔慢一点。不是所有人都跟得上你的节奏。",
  },
  ENTP: {
    title: "灵感整活型",
    vibe: "反应快，点子多，喜欢新鲜感，也喜欢把事情聊开。",
    kb: "你这类型不无聊。就是有时候脑子太快，别人还在加载。",
  },
  INFJ: {
    title: "温柔洞察型",
    vibe: "很能感受到别人情绪，也有自己的理想和边界。",
    kb: "你不是想太多，是看得比较深。别老替所有人消化情绪。",
  },
  INFP: {
    title: "柔软理想型",
    vibe: "心里很有世界，容易被细节打动，也容易被情绪影响。",
    kb: "你这种人挺珍贵的。只是别把所有难过都自己收着。",
  },
  ENFJ: {
    title: "温暖带动型",
    vibe: "很会照顾气氛，也容易主动把人聚起来。",
    kb: "你挺像人群里的小太阳。但小KB提醒，别把自己烧太累。",
  },
  ENFP: {
    title: "快乐灵感型",
    vibe: "热情、好奇、容易被新东西点燃，情绪也比较鲜活。",
    kb: "你很有感染力。就是灵感来了很猛，没电也是真的快。",
  },
  ISTJ: {
    title: "稳定靠谱型",
    vibe: "重视秩序和责任，做事踏实，不喜欢太虚的东西。",
    kb: "你这种人适合被信任。话不一定多，但事情会做到位。",
  },
  ISFJ: {
    title: "安静照顾型",
    vibe: "细心、稳妥、会默默记住别人的需要。",
    kb: "你不是没脾气，只是太习惯照顾别人。偶尔也照顾下自己。",
  },
  ESTJ: {
    title: "现实执行型",
    vibe: "效率高，讲规则，喜欢把事情处理清楚。",
    kb: "你很适合管事。就是有时候别太急，给别人一点缓冲。",
  },
  ESFJ: {
    title: "气氛照料型",
    vibe: "在意关系和氛围，容易主动照顾身边人。",
    kb: "你很会让人舒服。但也别老为了气氛委屈自己。",
  },
  ISTP: {
    title: "冷静实操型",
    vibe: "话不多，喜欢自己判断，遇事反而很稳。",
    kb: "你这种人看着淡，其实挺能扛事。属于关键时刻靠谱型。",
  },
  ISFP: {
    title: "松弛感受型",
    vibe: "审美和感受力比较强，不喜欢被逼太紧。",
    kb: "你需要自由一点的空间。太硬的环境，会把你弄烦。",
  },
  ESTP: {
    title: "现场反应型",
    vibe: "行动快，胆子大，适合在变化里找机会。",
    kb: "你挺会活在当下。小KB建议，冲可以，别每次都硬冲。",
  },
  ESFP: {
    title: "快乐现场型",
    vibe: "很有生命力，喜欢热闹，也容易把气氛带起来。",
    kb: "你在的时候，场子一般不会冷。挺好，就是别太消耗自己。",
  },
};

function getResultType(scores) {
  const ei = scores.E >= scores.I ? "E" : "I";
  const sn = scores.S >= scores.N ? "S" : "N";
  const tf = scores.T >= scores.F ? "T" : "F";
  const jp = scores.J >= scores.P ? "J" : "P";

  return `${ei}${sn}${tf}${jp}`;
}

function getPercent(a, b) {
  const total = a + b;
  if (!total) return 50;
  return Math.round((a / total) * 100);
}

export default function MbtiGamePage() {
  const [answers, setAnswers] = useState({});
  const [copied, setCopied] = useState(false);

  const answeredCount = Object.keys(answers).length;
  const finished = answeredCount === QUESTIONS.length;

  const scores = useMemo(() => {
    const base = {
      E: 0,
      I: 0,
      S: 0,
      N: 0,
      T: 0,
      F: 0,
      J: 0,
      P: 0,
    };

    Object.values(answers).forEach((value) => {
      if (base[value] !== undefined) {
        base[value] += 1;
      }
    });

    return base;
  }, [answers]);

  const resultType = finished ? getResultType(scores) : "";
  const result = finished ? RESULT_MAP[resultType] : null;

  const progress = Math.round((answeredCount / QUESTIONS.length) * 100);

  const resultText = finished
    ? `我的小KB MBTI 测试结果：${resultType}｜${result.title}

${result.vibe}

小KB评价：
${result.kb}

来测测你是哪种：
xiaokb.xyz/game/mbti`
    : "";

  function choose(questionId, value) {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
    setCopied(false);
  }

  function reset() {
    setAnswers({});
    setCopied(false);
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function copyResult() {
    if (!resultText) return;

    try {
      await navigator.clipboard.writeText(resultText);
      setCopied(true);
    } catch {
      setCopied(false);
      alert("复制失败，可以手动长按结果文案复制。");
    }
  }

  return (
    <main className="mbtiPage">
      <section className="mbtiShell">
        <header className="mbtiHero">
          <div className="mbtiBadge">XIAOKB GAME · MBTI</div>

          <h1>小KB MBTI 小测试</h1>

          <p>
            不搞太严肃。就 12 道题，测一下你更像哪种性格气质。
            结果不代表专业心理测评，图个好玩，也图个有点准。
          </p>

          <div className="progressBox">
            <div>
              <span>完成进度</span>
              <strong>
                {answeredCount}/{QUESTIONS.length}
              </strong>
            </div>

            <div className="progressBar">
              <i style={{ width: `${progress}%` }} />
            </div>
          </div>
        </header>

        {!finished && (
          <section className="questionList">
            {QUESTIONS.map((question) => (
              <article className="questionCard" key={question.id}>
                <div className="questionTop">
                  <span>Q{question.id}</span>
                  <h2>{question.text}</h2>
                </div>

                <div className="optionGrid">
                  {question.options.map((option) => (
                    <button
                      key={option.value}
                      className={
                        answers[question.id] === option.value
                          ? "optionBtn activeOption"
                          : "optionBtn"
                      }
                      onClick={() => choose(question.id, option.value)}
                    >
                      {option.text}
                    </button>
                  ))}
                </div>
              </article>
            ))}
          </section>
        )}

        {finished && result && (
          <section className="resultCard">
            <div className="resultGlow"></div>

            <div className="resultBadge">你的结果</div>

            <h2>{resultType}</h2>

            <h3>{result.title}</h3>

            <p>{result.vibe}</p>

            <div className="kbComment">
              <span>小KB评价</span>
              <strong>{result.kb}</strong>
            </div>

            <div className="dimensionGrid">
              <Dimension
                left="E 外向"
                right="I 内向"
                leftValue={getPercent(scores.E, scores.I)}
                rightValue={getPercent(scores.I, scores.E)}
              />
              <Dimension
                left="S 现实"
                right="N 直觉"
                leftValue={getPercent(scores.S, scores.N)}
                rightValue={getPercent(scores.N, scores.S)}
              />
              <Dimension
                left="T 理性"
                right="F 感受"
                leftValue={getPercent(scores.T, scores.F)}
                rightValue={getPercent(scores.F, scores.T)}
              />
              <Dimension
                left="J 计划"
                right="P 随性"
                leftValue={getPercent(scores.J, scores.P)}
                rightValue={getPercent(scores.P, scores.J)}
              />
            </div>

            <div className="resultTextBox">
              <pre>{resultText}</pre>
            </div>

            <div className="actionRow">
              <button onClick={copyResult}>
                {copied ? "已复制" : "复制结果"}
              </button>

              <button className="ghostBtn" onClick={reset}>
                重新测试
              </button>
            </div>
          </section>
        )}

        <footer className="mbtiFooter">
          <a href="/">回到小KB房间</a>
        </footer>
      </section>

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
        }

        .mbtiPage {
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

        .mbtiShell {
          width: min(920px, 100%);
          margin: 0 auto;
          padding: 28px 18px 40px;
        }

        .mbtiHero {
          position: relative;
          overflow: hidden;
          padding: 28px;
          border-radius: 34px;
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.13), rgba(255, 255, 255, 0.045)),
            rgba(13, 10, 27, 0.82);
          border: 1px solid rgba(255, 255, 255, 0.13);
          box-shadow:
            0 34px 120px rgba(0, 0, 0, 0.46),
            0 0 80px rgba(139, 92, 246, 0.16);
          backdrop-filter: blur(26px);
        }

        .mbtiHero::after {
          content: "";
          position: absolute;
          width: 220px;
          height: 220px;
          right: -80px;
          top: -90px;
          border-radius: 999px;
          background: rgba(168, 85, 247, 0.28);
          filter: blur(18px);
        }

        .mbtiBadge,
        .resultBadge {
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

        .mbtiHero h1 {
          position: relative;
          z-index: 1;
          margin: 18px 0 0;
          font-size: clamp(38px, 8vw, 72px);
          line-height: 0.96;
          letter-spacing: -0.08em;
        }

        .mbtiHero p {
          position: relative;
          z-index: 1;
          width: min(640px, 100%);
          margin: 16px 0 0;
          color: rgba(226, 232, 240, 0.66);
          font-size: 15px;
          line-height: 1.75;
        }

        .progressBox {
          position: relative;
          z-index: 1;
          margin-top: 24px;
          padding: 15px;
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .progressBox div:first-child {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
        }

        .progressBox span {
          color: rgba(226, 232, 240, 0.56);
          font-size: 13px;
        }

        .progressBox strong {
          font-size: 15px;
        }

        .progressBar {
          height: 10px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
        }

        .progressBar i {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(135deg, #8b5cf6, #ec4899);
          transition: width 0.25s ease;
        }

        .questionList {
          display: grid;
          gap: 14px;
          margin-top: 16px;
        }

        .questionCard,
        .resultCard {
          position: relative;
          overflow: hidden;
          padding: 22px;
          border-radius: 28px;
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.105), rgba(255, 255, 255, 0.045)),
            rgba(14, 11, 27, 0.76);
          border: 1px solid rgba(255, 255, 255, 0.105);
          box-shadow:
            0 22px 70px rgba(0, 0, 0, 0.22),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(22px);
        }

        .questionTop {
          display: flex;
          gap: 14px;
          align-items: flex-start;
        }

        .questionTop span {
          flex: 0 0 auto;
          padding: 7px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 900;
          color: rgba(233, 213, 255, 0.95);
          background: rgba(139, 92, 246, 0.16);
          border: 1px solid rgba(216, 180, 254, 0.14);
        }

        .questionTop h2 {
          margin: 4px 0 0;
          font-size: 20px;
          line-height: 1.35;
          letter-spacing: -0.035em;
        }

        .optionGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 18px;
        }

        .optionBtn {
          min-height: 58px;
          padding: 13px 14px;
          border-radius: 18px;
          cursor: pointer;
          color: rgba(255, 255, 255, 0.88);
          font-size: 14px;
          line-height: 1.45;
          text-align: left;
          background: rgba(255, 255, 255, 0.055);
          border: 1px solid rgba(255, 255, 255, 0.085);
          transition:
            transform 0.18s ease,
            background 0.18s ease,
            border 0.18s ease;
        }

        .optionBtn:hover {
          transform: translateY(-1px);
          background: rgba(139, 92, 246, 0.15);
          border-color: rgba(216, 180, 254, 0.2);
        }

        .activeOption {
          background:
            radial-gradient(circle at 16% 0%, rgba(216, 180, 254, 0.18), transparent 38%),
            linear-gradient(135deg, rgba(139, 92, 246, 0.28), rgba(236, 72, 153, 0.12));
          border-color: rgba(216, 180, 254, 0.38);
          box-shadow: 0 12px 36px rgba(139, 92, 246, 0.14);
        }

        .resultCard {
          margin-top: 16px;
          padding: 28px;
        }

        .resultGlow {
          position: absolute;
          width: 260px;
          height: 260px;
          right: -90px;
          top: -90px;
          border-radius: 999px;
          background: rgba(236, 72, 153, 0.18);
          filter: blur(16px);
        }

        .resultCard h2 {
          position: relative;
          margin: 18px 0 0;
          font-size: clamp(64px, 15vw, 128px);
          line-height: 0.85;
          letter-spacing: -0.095em;
          background: linear-gradient(135deg, #fff, #ddd6fe, #f0abfc);
          -webkit-background-clip: text;
          color: transparent;
        }

        .resultCard h3 {
          position: relative;
          margin: 18px 0 0;
          font-size: 28px;
          letter-spacing: -0.05em;
        }

        .resultCard p {
          position: relative;
          width: min(640px, 100%);
          margin: 12px 0 0;
          color: rgba(226, 232, 240, 0.68);
          line-height: 1.75;
        }

        .kbComment {
          position: relative;
          margin-top: 18px;
          padding: 16px;
          border-radius: 20px;
          background: rgba(139, 92, 246, 0.12);
          border: 1px solid rgba(216, 180, 254, 0.16);
        }

        .kbComment span {
          display: block;
          font-size: 12px;
          color: rgba(216, 180, 254, 0.86);
          font-weight: 900;
          margin-bottom: 8px;
        }

        .kbComment strong {
          display: block;
          font-size: 15px;
          line-height: 1.7;
        }

        .dimensionGrid {
          position: relative;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 16px;
        }

        .dimension {
          padding: 14px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.052);
          border: 1px solid rgba(255, 255, 255, 0.075);
        }

        .dimensionTop {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          font-size: 12px;
          color: rgba(226, 232, 240, 0.62);
        }

        .dimensionBar {
          height: 9px;
          display: flex;
          overflow: hidden;
          border-radius: 999px;
          margin-top: 11px;
          background: rgba(255, 255, 255, 0.08);
        }

        .dimensionBar i:first-child {
          background: linear-gradient(135deg, #8b5cf6, #c084fc);
        }

        .dimensionBar i:last-child {
          background: linear-gradient(135deg, #ec4899, #f0abfc);
        }

        .resultTextBox {
          position: relative;
          margin-top: 16px;
          padding: 14px;
          border-radius: 18px;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .resultTextBox pre {
          margin: 0;
          white-space: pre-wrap;
          word-break: break-word;
          color: rgba(226, 232, 240, 0.72);
          font-family: inherit;
          font-size: 13px;
          line-height: 1.65;
        }

        .actionRow {
          position: relative;
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 16px;
        }

        .actionRow button {
          height: 48px;
          padding: 0 18px;
          border: 0;
          border-radius: 16px;
          cursor: pointer;
          color: white;
          font-weight: 900;
          background: linear-gradient(135deg, #8b5cf6, #d946ef);
          box-shadow: 0 18px 42px rgba(139, 92, 246, 0.22);
        }

        .actionRow .ghostBtn {
          background: rgba(255, 255, 255, 0.075);
          box-shadow: none;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .mbtiFooter {
          text-align: center;
          margin-top: 22px;
        }

        .mbtiFooter a {
          color: rgba(226, 232, 240, 0.56);
          text-decoration: none;
          font-size: 13px;
        }

        @media (max-width: 720px) {
          .mbtiShell {
            padding: 16px 12px 34px;
          }

          .mbtiHero,
          .resultCard {
            border-radius: 28px;
            padding: 22px;
          }

          .questionCard {
            padding: 18px;
            border-radius: 24px;
          }

          .optionGrid,
          .dimensionGrid {
            grid-template-columns: 1fr;
          }

          .questionTop h2 {
            font-size: 18px;
          }

          .optionBtn {
            min-height: 54px;
          }

          .actionRow button {
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}

function Dimension({ left, right, leftValue, rightValue }) {
  return (
    <div className="dimension">
      <div className="dimensionTop">
        <span>
          {left} · {leftValue}%
        </span>
        <span>
          {right} · {rightValue}%
        </span>
      </div>

      <div className="dimensionBar">
        <i style={{ width: `${leftValue}%` }} />
        <i style={{ width: `${rightValue}%` }} />
      </div>
    </div>
  );
}
