# 小KB for iPhone

这是小KB的 SwiftUI + WKWebView 原生壳工程骨架。

## 已接入

- SwiftUI 原生启动 KB Core
- WKWebView 加载 `https://xiaokb.xyz`
- 首次 AI 数据处理说明与明确同意
- Core Motion 原生设备运动采样
- 原生运动数据通过 `kb-native-motion` 事件驱动现有空间折射引擎
- JavaScript Bridge 原生触觉反馈
- 外部链接跳出 App 交给系统打开
- App 内仅允许小KB域名直接导航

## 在 Mac 上生成 Xcode 工程

1. 安装 Xcode 16 或更高版本。
2. 安装 XcodeGen：

```bash
brew install xcodegen
```

3. 进入本目录并生成工程：

```bash
cd ios
xcodegen generate
open XiaoKB.xcodeproj
```

4. Xcode 中选择 `XiaoKB` Target → Signing & Capabilities：
   - Team：选择你的 Apple Developer Team
   - Bundle Identifier：确认 `com.xiaokb.app` 可用；若已被占用，改成你自己的唯一标识
   - Automatically manage signing：开启

5. 连接 iPhone 真机，先运行并验证：
   - 首次 AI 数据说明正常出现
   - 同意后原生启动动画正常
   - 页面加载 `xiaokb.xyz`
   - 键盘输入不异常放大
   - 发送/按钮触觉正常
   - 手机倾斜能驱动折射场
   - 记忆中心、MBTI、文案、反馈可用

## Archive / App Store Connect

在 Xcode 选择 `Any iOS Device (arm64)`，然后：

`Product → Archive → Distribute App → App Store Connect → Upload`

上传后在 App Store Connect 创建或选择 App，关联构建并填写审核信息。

## App Store Connect 建议字段

- App Name：小KB
- Subtitle：进来坐会儿，和小KB聊聊天
- Privacy Policy URL：`https://xiaokb.xyz/privacy`
- Support URL：`https://xiaokb.xyz/support`
- Primary Category：Lifestyle（可根据最终定位复核）

## 审核备注建议

小KB是 AI 对话产品。iPhone App 在 Web 产品体验之上增加原生启动体验、原生触觉反馈与 Core Motion 空间感应。设备运动数据仅在本机用于视觉响应，不作为聊天内容发送。首次使用 AI 聊天前，App 会明确说明聊天内容会发送至第三方 AI 服务提供商 DeepSeek 用于生成回复，并要求用户明确同意。

无需登录即可体验主要功能。审核期间请保持 `https://xiaokb.xyz` 及后端 AI 服务在线。

## 还需要你本人完成

- Apple Developer Program 会员资格
- Xcode Signing Team / 证书
- 最终 Bundle ID
- App Icon 1024×1024 与 Asset Catalog
- App Store 截图
- App Store Connect 隐私问卷、年龄分级与出口合规问题
- Archive、上传与提交审核

这些步骤依赖你的 Apple 账号和签名身份，不应把凭据提交到 GitHub。
