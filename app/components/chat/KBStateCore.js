const CORE_LABELS = {
  idle: "小KB 待机中",
  listening: "小KB 正在听",
  thinking: "小KB 正在思考",
  responding: "小KB 正在回应",
  research: "小KB 研究模式",
};

export default function KBStateCore({ state = "idle", mode = "daily", variant = "hero" }) {
  const safeState = CORE_LABELS[state] ? state : "idle";

  return (
    <div
      className={`emptyCore kbStateCore kbStateCore--${variant}`}
      data-logo-core
      data-core-state={safeState}
      data-core-mode={mode}
      role="img"
      aria-label={CORE_LABELS[safeState]}
    >
      <span className="kbCoreAura" aria-hidden="true" />
      <span className="kbCoreOrbit kbCoreOrbitA" aria-hidden="true" />
      <span className="kbCoreOrbit kbCoreOrbitB" aria-hidden="true" />
      <span className="kbCoreFlux" aria-hidden="true" />
      <span className="emptyCoreDot one" aria-hidden="true" />
      <span className="emptyCoreDot two" aria-hidden="true" />
      <div className="emptyMark kbStateCoreMark">KB</div>
      <span className="kbCorePulse" aria-hidden="true" />
    </div>
  );
}
