export const metadata = {
  title: "隐私说明 · 小KB",
  description: "小KB隐私与AI数据处理说明",
};

const sectionStyle = {
  padding: "22px 0",
  borderBottom: "1px solid rgba(255,255,255,.08)",
};

export default function PrivacyPage() {
  return (
    <main style={{ minHeight: "100dvh", background: "#07050d", color: "rgba(255,255,255,.9)", padding: "64px 22px 90px" }}>
      <article style={{ width: "min(760px, 100%)", margin: "0 auto" }}>
        <a href="/" style={{ color: "#b99aff", textDecoration: "none", fontSize: 14 }}>← 返回小KB</a>
        <p style={{ margin: "30px 0 8px", color: "#a887ff", letterSpacing: ".12em", fontSize: 12 }}>XIAOKB PRIVACY</p>
        <h1 style={{ margin: 0, fontSize: "clamp(34px, 7vw, 58px)", letterSpacing: "-.04em" }}>隐私说明</h1>
        <p style={{ color: "rgba(255,255,255,.56)", lineHeight: 1.8 }}>更新日期：2026年7月11日。小KB希望把数据边界说清楚，而不是藏在很长的条款里。</p>

        <section style={sectionStyle}>
          <h2>AI 聊天数据</h2>
          <p style={{ lineHeight: 1.9, color: "rgba(255,255,255,.72)" }}>当你向小KB发送消息时，聊天内容会通过小KB的服务发送给第三方 AI 服务提供商 DeepSeek，用于生成回复。小KB不会把设备方向数据作为聊天内容发送给 AI。</p>
        </section>

        <section style={sectionStyle}>
          <h2>聊天记录与运行日志</h2>
          <p style={{ lineHeight: 1.9, color: "rgba(255,255,255,.72)" }}>为维持聊天体验，当前浏览器会保存本地聊天记录。服务端可能保存必要的聊天运行日志、模式、模型和延迟等信息，用于服务稳定性、故障排查和产品改进。</p>
        </section>

        <section style={sectionStyle}>
          <h2>记忆中心</h2>
          <p style={{ lineHeight: 1.9, color: "rgba(255,255,255,.72)" }}>普通记忆由你主动新增、编辑、暂停或删除。当前版本保存在当前浏览器本地。启用的记忆会作为你主动保存的背景信息参与后续聊天上下文，不会显示成聊天消息。</p>
        </section>

        <section style={sectionStyle}>
          <h2>设备方向与空间感应</h2>
          <p style={{ lineHeight: 1.9, color: "rgba(255,255,255,.72)" }}>空间感应使用设备运动或方向数据驱动紫色折射场、KB Core 和输入区视觉响应。这些数据只用于当前设备的视觉计算，不会作为聊天内容发送，也不会用于定位你的位置。</p>
        </section>

        <section style={sectionStyle}>
          <h2>你的选择</h2>
          <p style={{ lineHeight: 1.9, color: "rgba(255,255,255,.72)" }}>你可以删除本地聊天记录、在记忆中心删除普通记忆，并在网页版本关闭空间感应。iPhone App 首次使用 AI 聊天前会说明第三方 AI 数据处理方式并请求明确同意。</p>
        </section>

        <section style={{ padding: "22px 0" }}>
          <h2>联系我们</h2>
          <p style={{ lineHeight: 1.9, color: "rgba(255,255,255,.72)" }}>关于隐私、数据或产品问题，请打开小KB，在「工具 → 反馈」中提交。我们会通过现有反馈系统接收并处理。</p>
        </section>
      </article>
    </main>
  );
}
