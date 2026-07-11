export default function EmptyState({ mode, prompts, disabled, onPrompt }) {
  const research = mode === "research";
  return (
    <section className="chatEmptyState">
      <div className="emptyCore" data-logo-core>
        <span className="emptyCoreDot one" aria-hidden="true" />
        <span className="emptyCoreDot two" aria-hidden="true" />
        <div className="emptyMark">KB</div>
      </div>
      <p className="emptyEyebrow">{research ? "RESEARCH MODE" : "XIAOKB AI"}</p>
      <h1>{research ? "把复杂问题，交给小KB拆开" : "今天想聊点什么？"}</h1>
      <p className="emptyDescription">
        {research
          ? "整理资料、分析逻辑、润色表达或搭建思路。把材料直接发来就好。"
          : "不必组织好语言。说一句近况、一个念头，或者只是来坐一会儿。"}
      </p>
      <div className="emptyPrompts">
        {prompts.map((prompt) => (
          <button type="button" key={prompt} onClick={() => onPrompt(prompt)} disabled={disabled} data-spotlight-card>
            <span>{prompt}</span><em>↗</em>
          </button>
        ))}
      </div>
    </section>
  );
}
