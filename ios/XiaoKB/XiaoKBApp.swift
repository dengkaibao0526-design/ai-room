import SwiftUI

@main
struct XiaoKBApp: App {
    @AppStorage("xiaokb.aiDataConsent.v1") private var aiDataConsent = false

    var body: some Scene {
        WindowGroup {
            ZStack {
                Color(red: 0.025, green: 0.018, blue: 0.045)
                    .ignoresSafeArea()

                if aiDataConsent {
                    AppRootView()
                } else {
                    AIDataConsentView {
                        aiDataConsent = true
                    }
                }
            }
            .preferredColorScheme(.dark)
        }
    }
}
