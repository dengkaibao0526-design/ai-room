import CoreMotion
import SwiftUI
import UIKit
import WebKit

struct XiaoKBWebView: UIViewRepresentable {
    let url: URL

    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    func makeUIView(context: Context) -> WKWebView {
        let controller = WKUserContentController()
        controller.add(context.coordinator, name: "xiaokb")
        controller.addUserScript(WKUserScript(
            source: Self.nativeBootstrapScript,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        ))

        let configuration = WKWebViewConfiguration()
        configuration.userContentController = controller
        configuration.websiteDataStore = .default()
        configuration.defaultWebpagePreferences.allowsContentJavaScript = true

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.scrollView.keyboardDismissMode = .interactive
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 0.02, green: 0.014, blue: 0.038, alpha: 1)
        webView.scrollView.backgroundColor = webView.backgroundColor
        webView.allowsBackForwardNavigationGestures = true

        context.coordinator.attach(webView: webView)
        webView.load(URLRequest(url: url, cachePolicy: .reloadRevalidatingCacheData, timeoutInterval: 30))
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}

    static let nativeBootstrapScript = #"""
    (() => {
      window.__XIAOKB_IOS_APP__ = true;
      window.xiaokbNative = {
        haptic(style = 'light') {
          try { window.webkit?.messageHandlers?.xiaokb?.postMessage({ type: 'haptic', style }); } catch (_) {}
        }
      };

      document.addEventListener('click', (event) => {
        const button = event.target?.closest?.('button');
        if (!button) return;
        const name = `${button.className || ''} ${button.getAttribute('aria-label') || ''}`.toLowerCase();
        if (name.includes('send') || name.includes('发送')) window.xiaokbNative.haptic('medium');
        else if (name.includes('stop') || name.includes('停止')) window.xiaokbNative.haptic('rigid');
        else window.xiaokbNative.haptic('light');
      }, { passive: true });
    })();
    """#

    final class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
        private weak var webView: WKWebView?
        private let motionManager = CMMotionManager()
        private let motionQueue: OperationQueue = {
            let queue = OperationQueue()
            queue.qualityOfService = .userInteractive
            queue.maxConcurrentOperationCount = 1
            return queue
        }()

        func attach(webView: WKWebView) {
            self.webView = webView
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            startMotionIfAvailable()
        }

        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let target = navigationAction.request.url else {
                decisionHandler(.cancel)
                return
            }

            if let host = target.host, host == "xiaokb.xyz" || host.hasSuffix(".xiaokb.xyz") {
                decisionHandler(.allow)
                return
            }

            if navigationAction.navigationType == .linkActivated {
                UIApplication.shared.open(target)
                decisionHandler(.cancel)
                return
            }

            decisionHandler(.allow)
        }

        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            guard message.name == "xiaokb",
                  let payload = message.body as? [String: Any],
                  let type = payload["type"] as? String else { return }

            if type == "haptic" {
                let style = payload["style"] as? String ?? "light"
                DispatchQueue.main.async {
                    Self.playHaptic(style: style)
                }
            }
        }

        private func startMotionIfAvailable() {
            guard motionManager.isDeviceMotionAvailable, !motionManager.isDeviceMotionActive else { return }
            motionManager.deviceMotionUpdateInterval = 1.0 / 30.0
            motionManager.startDeviceMotionUpdates(to: motionQueue) { [weak self] motion, _ in
                guard let self, let motion else { return }

                let x = max(-1, min(1, motion.gravity.x * 1.35))
                let y = max(-1, min(1, motion.gravity.y * -1.15))
                let script = "window.dispatchEvent(new CustomEvent('kb-native-motion',{detail:{x:\(x),y:\(y)}}));"

                DispatchQueue.main.async { [weak self] in
                    self?.webView?.evaluateJavaScript(script)
                }
            }
        }

        private static func playHaptic(style: String) {
            let feedbackStyle: UIImpactFeedbackGenerator.FeedbackStyle
            switch style {
            case "medium": feedbackStyle = .medium
            case "rigid": feedbackStyle = .rigid
            case "soft": feedbackStyle = .soft
            default: feedbackStyle = .light
            }
            let generator = UIImpactFeedbackGenerator(style: feedbackStyle)
            generator.prepare()
            generator.impactOccurred()
        }

        deinit {
            motionManager.stopDeviceMotionUpdates()
        }
    }
}
