export const metadata = {
  title: "支持 · 小KB",
  description: "小KB帮助与联系入口",
};

export default function SupportPage() {
  return (
    <main style={{ minHeight: "100dvh", background: "#07050d", color: "rgba(255,255,255,.9)", padding: "64px 22px 90px" }}>
      <article style={{ width: "min(720px, 100%)", margin: "0 auto" }}>
        <a href="/" style={{ color: "#b99aff", textDecoration: "none", fontSize: 14 }}>← 返回小KB</a>
        <p style={{ margin: "30px 0 8px", color: "#a887ff", letterSpacing: ".12em", fontSize: 12 }}>XIAOKB SUPPORT</p>
        <h1 style={{ margin: 0, fontSize: "clamp(34px, 7vw, 58px)", letterSpacing: "-.04em" }}>有事就说。</h1>
        <p style={{ color: "rgba(255,255,255,.58)", lineHeight: 1.8, fontSize: 17 }}>遇到聊天异常、功能问题、隐私问题，或者只是有个建议，都可以直接从小KB里联系开发者。</p>

        <section style={{ marginTop: 34, padding: 24, border: "1px solid rgba(180,140,255,.18)", borderRadius: 22, background: "linear-gradient(145deg, rgba(121,74,220,.11), rgba(255,255,255,.025))", boxShadow: "0 28px 80px rgba(0,0,0,.32)" }}>
          <h2 style={{ marginTop: 0 }}>最快的联系方式</h2>
          <p style={{ color: "rgba(255,255,255,.72)", lineHeight: 1.9 }}>打开小KB → 点击顶部「反馈」，移动端则打开「工具 → 反馈」。填写问题或建议后直接提交即可。</p>
          <a href="/" style={{ display: "inline-flex", marginTop: 8, color: "#fff", textDecoration: "none", padding: "12px 18px", borderRadius: 14, background: "linear-gradient(135deg,#8758f6,#5d31c9)" }}>进入小KB</a>
        </section>

        <section style={{ padding: "28px 0", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
          <h2>提交问题时</h2>
          <p style={{ color: "rgba(255,255,255,.68)", lineHeight: 1.9 }}>最好说明你使用的是网页还是 iPhone App、发生问题前做了什么，以及是否能稳定复现。不要在反馈中提交密码、验证码或其他敏感凭据。</p>
        </section>

        <section style={{ padding: "28px 0" }}>
          <h2>隐私问题</h2>
          <p style={{ color: "rgba(255,255,255,.68)", lineHeight: 1.9 }}>关于 AI 数据处理、记忆中心和设备方向数据，请查看 <a href="/privacy" style={{ color: "#b99aff" }}>小KB隐私说明</a>。</p>
        </section>
      </article>
    </main>
  );
}
