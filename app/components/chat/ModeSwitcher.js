export default function ModeSwitcher({ mode, enabled, disabled, onChange }) {
  return (
    <div className="chatModeSwitch" aria-label="聊天模式">
      <button
        type="button"
        className={mode === "daily" ? "isActive" : ""}
        onClick={() => onChange("daily")}
        disabled={disabled}
      >
        日常
      </button>
      {enabled && (
        <button
          type="button"
          className={mode === "research" ? "isActive" : ""}
          onClick={() => onChange("research")}
          disabled={disabled}
        >
          研究
        </button>
      )}
    </div>
  );
}
