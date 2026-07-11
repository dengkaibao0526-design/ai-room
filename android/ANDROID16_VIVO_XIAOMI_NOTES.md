# Android 16 / vivo / Xiaomi adaptation

This Android shell now compiles and targets API 36.

The adaptation prioritizes the system behaviors most visible on gesture-heavy Android skins such as vivo OriginOS and Xiaomi HyperOS:

- Android 16 mandatory edge-to-edge behavior
- display cutout and rounded-screen safe insets
- bottom gesture/navigation inset handling
- IME resize without double-padding the composer
- predictive back through AndroidX OnBackPressedDispatcher
- WebView state restoration across configuration changes
- dark system bar contrast behavior
- adaptive and monochrome launcher icon resources

The implementation intentionally avoids manufacturer-private APIs and brittle `Build.MANUFACTURER` branches. Platform APIs remain the source of truth so the app behaves consistently across Android 16 devices while vivo and Xiaomi remain the priority real-device test targets.
