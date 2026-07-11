# 小KB Android

小KB Android 是一个轻量原生壳。聊天、KB Core、呼吸引擎、记忆中心和工具继续来自 `https://xiaokb.xyz`；Android 原生层只负责系统级能力和 App 体验。

## 已接能力

- 原生 KB Core 启动层
- 深色沉浸式 WebView
- 30 Hz 设备姿态采样并发送 `kb-native-motion`
- 原生 Haptic / vibration bridge
- 系统返回键与返回手势
- 外部链接交给系统浏览器
- Web 文件选择器
- Android 分享目标：分享文字到小KB后填入输入框，不自动发送
- 原生 App 中空间感应自动接管

## 本地运行

1. 用 Android Studio 打开仓库中的 `android/` 目录。
2. 等待 Gradle Sync 完成。
3. 选择 Android 8.0（API 26）或更高版本的模拟器/真机。
4. 运行 `app`。

应用 ID：`xyz.xiaokb.app`

## 构建 Debug APK

```bash
cd android
gradle :app:assembleDebug
```

输出位置：

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

仓库中的 Android CI 也会在相关 PR 上执行同一构建，并上传 debug APK artifact。

## 架构边界

网页更新继续跟随 Vercel，不需要重新安装 APK。只有 `android/` 里的 Kotlin、Manifest、资源或原生桥接发生变化时，才需要重新构建 APK。
