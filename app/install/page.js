export const metadata = {
  title: "下载小KB",
  description: "在 iPhone 或 Android 手机上安装小KB。",
};

const iphoneSteps = [
  ["01", "使用 Safari 下载", "点“下载 iPhone 安装文件”。Safari 会下载小KB描述文件。"],
  ["02", "打开系统设置", "进入“设置 → 通用 → VPN 与设备管理”，找到“小KB”。"],
  ["03", "完成安装", "按系统提示点安装。装好后回到主屏幕，就会看到小KB。"],
  ["04", "以后直接点开", "它打开的仍然是 xiaokb.xyz，网站更新后不用重新安装。"],
];

const androidSteps = [
  ["01", "下载 APK", "点“下载 Android 安装包”，等待小KB APK 下载完成。"],
  ["02", "允许本次安装", "vivo、iQOO、小米或 Redmi 如果提示“禁止安装未知应用”，按系统提示允许当前浏览器或文件管理器安装。"],
  ["03", "继续安装", "返回安装页面，点“安装”。如果手机里已经有旧版小KB，可以直接覆盖更新。"],
  ["04", "打开小KB", "安装完成后从桌面进入。Android 16 版包含高刷优先、Motion Engine 120 和原生空间感应。"],
];

function PlatformCard({ badge, icon, title, lead, href, button, hint, children, tone }) {
  return (
    <article className={`downloadPlatformCard downloadPlatformCard--${tone}`}>
      <div className="downloadPlatformGlow" aria-hidden="true" />
      <div className="downloadPlatformHead">
        <span className="downloadPlatformBadge">{badge}</span>
        <span className="downloadPlatformSymbol" aria-hidden="true">{icon}</span>
      </div>
      <h2>{title}</h2>
      <p className="downloadPlatformLead">{lead}</p>
      <a className="webclipInstallDownload" href={href}>{button}</a>
      <small className="webclipInstallHint">{hint}</small>
      {children}
    </article>
  );
}

function StepList({ steps }) {
  return (
    <div className="webclipInstallSteps">
      {steps.map(([number, title, text]) => (
        <article key={number}>
          <em>{number}</em>
          <div><strong>{title}</strong><p>{text}</p></div>
        </article>
      ))}
    </div>
  );
}

export default function InstallPage() {
  return (
    <main className="webclipInstallPage downloadCenterPage">
      <div className="webclipInstallAmbient" aria-hidden="true" />
      <section className="webclipInstallHero downloadCenterHero">
        <a className="webclipInstallBack" href="/">← 回到小KB</a>
        <div className="webclipInstallBadge">XIAOKB · MOBILE</div>
        <img className="webclipInstallIcon" src="/icons/apple-touch-icon.png" alt="小KB 图标" />
        <h1>把小KB装进手机</h1>
        <p className="webclipInstallLead">苹果和安卓都放在这里。选你手里的设备，跟着下面几步走就行，不需要折腾开发工具。</p>
      </section>

      <section className="downloadPlatformGrid">
        <PlatformCard
          badge=" iPhone"
          icon=""
          title="安装到 iPhone"
          lead="把小KB放到主屏幕，全屏打开，体验更像一个 App。"
          href="/install/profile"
          button="下载 iPhone 安装文件"
          hint="建议使用 Safari 打开并下载"
          tone="apple"
        >
          <div className="webclipInstallSafety">
            <span>安全说明</span>
            <p>不会安装任何 VPN、证书或设备管理，也不会获得任何额外的系统控制权限。安装后打开的仍然是 xiaokb.xyz，只是把它放到了主屏幕，体验更像一个 App。不想用了随时可以删除，在设置里移除描述文件就可以了。</p>
          </div>
          <StepList steps={iphoneSteps} />
          <p className="downloadRemoveTip"><strong>怎么删除：</strong>设置 → 通用 → VPN 与设备管理 → 小KB → 移除描述文件。</p>
        </PlatformCard>

        <PlatformCard
          badge="ANDROID 16"
          icon="A"
          title="安装到 Android"
          lead="原生安卓壳，优先适配 Android 16、vivo / iQOO OriginOS 和小米 / Redmi HyperOS。"
          href="/downloads/XiaoKB-Android16-Motion120.apk"
          button="下载 Android 安装包"
          hint="当前版本 · Android 16 Motion Engine 120"
          tone="android"
        >
          <div className="webclipInstallSafety">
            <span>安装提醒</span>
            <p>这是小KB官网提供的 APK 测试安装包。安卓第一次从浏览器安装 APK 时，系统可能要求你允许“安装未知应用”；这是 Android 的系统安装限制，不代表小KB获得了额外设备控制权限。</p>
          </div>
          <StepList steps={androidSteps} />
          <div className="downloadVendorTips">
            <div><strong>vivo / iQOO</strong><p>看到安全提示时，按页面进入当前浏览器或文件管理器的安装权限，允许本次安装后返回继续。</p></div>
            <div><strong>小米 / Redmi</strong><p>HyperOS 可能会先做安装包安全扫描。扫描结束后继续安装；旧版小KB可以直接覆盖更新。</p></div>
          </div>
        </PlatformCard>
      </section>

      <section className="downloadCenterFooter">
        <span>两个版本打开的都是同一个小KB。</span>
        <p>聊天、记忆和网页功能会跟随 xiaokb.xyz 更新；只有安卓原生能力更新时，才需要重新下载 APK。</p>
      </section>
    </main>
  );
}
