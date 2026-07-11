export const metadata = {
  title: "安装小KB",
  description: "把小KB添加到 iPhone 主屏幕。",
};

export default function InstallPage() {
  return (
    <main className="webclipInstallPage">
      <div className="webclipInstallAmbient" aria-hidden="true" />
      <section className="webclipInstallHero">
        <a className="webclipInstallBack" href="/">← 回到小KB</a>
        <div className="webclipInstallBadge"> iPhone 安装版</div>
        <img className="webclipInstallIcon" src="/icons/apple-touch-icon.png" alt="小KB 图标" />
        <h1>把小KB放到主屏幕</h1>
        <p className="webclipInstallLead">以后点一下就能进来。没有地址栏挡着，打开方式更像一个 App，而且网站更新后这里也会跟着更新。</p>
        <a className="webclipInstallDownload" href="/install/profile">下载小KB描述文件</a>
        <span className="webclipInstallHint">建议使用 Safari 打开并下载</span>
      </section>

      <section className="webclipInstallPanel">
        <div className="webclipInstallSafety">
          <span>安全说明</span>
          <p>不会安装任何VPN、证书或设备管理，也不会获得任何额外的系统控制权限。安装后打开的仍然是 xiaokb.xyz，只是把它放到了主屏幕，体验更像一个 App，不想用了随时可以删除，就在设置里移除就可以了。</p>
        </div>

        <div className="webclipInstallSteps">
          <article><em>01</em><div><strong>下载描述文件</strong><p>点上面的按钮，Safari 会下载“小KB”描述文件。</p></div></article>
          <article><em>02</em><div><strong>打开系统设置</strong><p>进入“设置 → 通用 → VPN 与设备管理”，找到“小KB”。</p></div></article>
          <article><em>03</em><div><strong>点安装</strong><p>按系统提示完成安装，然后回到主屏幕。</p></div></article>
          <article><em>04</em><div><strong>进来坐会儿</strong><p>桌面会出现小KB图标，点一下就能直接回来。</p></div></article>
        </div>
      </section>
    </main>
  );
}
