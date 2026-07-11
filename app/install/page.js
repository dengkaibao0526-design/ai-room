export const metadata = {
  title: "下载小KB",
  description: "在 iPhone 或 Android 上安装小KB。",
};

const platforms = [
  {
    key: "iphone",
    badge: " iPhone",
    title: "放到 iPhone 主屏幕",
    lead: "下载小KB描述文件，安装后桌面会出现小KB。打开的仍然是 xiaokb.xyz，网站更新后也会同步更新。",
    href: "/install/profile",
    action: "下载 iPhone 描述文件",
    hint: "建议使用 Safari 打开并下载",
    steps: [
      ["01", "下载描述文件", "点下载按钮，Safari 会下载“小KB”描述文件。"],
      ["02", "打开系统设置", "进入“设置 → 通用 → VPN 与设备管理”，找到“小KB”。"],
      ["03", "点安装", "按系统提示完成安装，然后回到主屏幕。"],
      ["04", "打开小KB", "桌面会出现小KB图标，点一下就能直接进来。"],
    ],
    safety: "不会安装任何 VPN、证书或设备管理，也不会获得任何额外的系统控制权限。安装后打开的仍然是 xiaokb.xyz，只是把它放到了主屏幕。不想用了随时可以在设置里移除描述文件。",
  },
  {
    key: "android",
    badge: "Android 16 · Motion120",
    title: "安装小KB Android",
    lead: "这是目前的小KB Android 测试版，优先适配 Android 16、vivo OriginOS 与小米 HyperOS，并带有原生高刷、陀螺仪和系统级触觉桥接。",
    href: "/downloads/xiaokb-android16-motion120.apk",
    action: "下载 Android APK",
    hint: "当前为测试安装包，可直接覆盖旧版更新",
    steps: [
      ["01", "下载 APK", "点下载按钮，浏览器会保存小KB安装包。"],
      ["02", "允许本次安装", "如果系统提示“禁止安装未知应用”，按提示允许当前浏览器或文件管理器安装。"],
      ["03", "继续安装", "vivo / 小米可能会再做一次安全扫描，这是系统自己的安装流程，确认安装即可。"],
      ["04", "打开小KB", "安装完成后从桌面打开。以后网页内容更新通常不需要重新装 APK。"],
    ],
    safety: "APK 只用于承载小KB官网和提供陀螺仪、触觉、分享、文件选择等原生能力。安装时请确认应用名称是“小KB”。系统如果展示风险提醒，请先核对下载来源为 xiaokb.xyz。",
  },
];

export default function InstallPage() {
  return (
    <main className="webclipInstallPage downloadCenterPage">
      <div className="webclipInstallAmbient" aria-hidden="true" />
      <section className="webclipInstallHero downloadCenterHero">
        <a className="webclipInstallBack" href="/">← 回到小KB</a>
        <div className="webclipInstallBadge">KB DOWNLOAD CENTER</div>
        <img className="webclipInstallIcon" src="/icons/apple-touch-icon.png" alt="小KB 图标" />
        <h1>把小KB带走</h1>
        <p className="webclipInstallLead">iPhone 和 Android 都放在这里。选你的设备，照着下面一步一步装就行。</p>
      </section>

      <section className="downloadPlatformGrid" aria-label="小KB 下载平台">
        {platforms.map((platform) => (
          <article className={`downloadPlatformCard is-${platform.key}`} key={platform.key}>
            <div className="downloadPlatformTop">
              <span className="downloadPlatformBadge">{platform.badge}</span>
              <h2>{platform.title}</h2>
              <p>{platform.lead}</p>
              <a className="webclipInstallDownload" href={platform.href} download={platform.key === "android" ? true : undefined}>{platform.action}</a>
              <small className="webclipInstallHint">{platform.hint}</small>
            </div>

            <div className="webclipInstallSafety">
              <span>安装说明</span>
              <p>{platform.safety}</p>
            </div>

            <div className="webclipInstallSteps">
              {platform.steps.map(([number, title, text]) => (
                <article key={number}>
                  <em>{number}</em>
                  <div><strong>{title}</strong><p>{text}</p></div>
                </article>
              ))}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
