import SwiftUI

struct AppRootView: View {
    @State private var showLaunch = true

    var body: some View {
        ZStack {
            XiaoKBWebView(url: URL(string: "https://xiaokb.xyz")!)
                .ignoresSafeArea()
                .opacity(showLaunch ? 0 : 1)

            if showLaunch {
                NativeCoreLaunchView()
                    .transition(.opacity)
            }
        }
        .task {
            try? await Task.sleep(for: .milliseconds(1450))
            withAnimation(.easeOut(duration: 0.42)) {
                showLaunch = false
            }
        }
    }
}

private struct NativeCoreLaunchView: View {
    @State private var awake = false

    var body: some View {
        ZStack {
            Color(red: 0.02, green: 0.014, blue: 0.038)
                .ignoresSafeArea()

            RadialGradient(
                colors: [Color(red: 0.36, green: 0.16, blue: 0.78).opacity(awake ? 0.34 : 0.10), .clear],
                center: .center,
                startRadius: 8,
                endRadius: awake ? 210 : 125
            )
            .ignoresSafeArea()
            .animation(.easeInOut(duration: 1.05), value: awake)

            ZStack {
                Circle()
                    .stroke(Color.white.opacity(0.15), lineWidth: 0.8)
                    .frame(width: 96, height: 96)
                    .rotationEffect(.degrees(awake ? 28 : -8))

                Circle()
                    .stroke(Color(red: 0.63, green: 0.39, blue: 1.0).opacity(0.38), lineWidth: 0.9)
                    .frame(width: 78, height: 104)
                    .rotationEffect(.degrees(awake ? -48 : 24))

                Text("KB")
                    .font(.system(size: 19, weight: .bold, design: .rounded))
                    .foregroundStyle(.white)
                    .frame(width: 58, height: 58)
                    .background(
                        RoundedRectangle(cornerRadius: 18, style: .continuous)
                            .fill(
                                LinearGradient(
                                    colors: [Color(red: 0.73, green: 0.55, blue: 1), Color(red: 0.37, green: 0.16, blue: 0.8)],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                    )
                    .shadow(color: Color.purple.opacity(awake ? 0.52 : 0.18), radius: awake ? 34 : 14)
                    .scaleEffect(awake ? 1.0 : 0.92)
            }
            .animation(.spring(response: 0.9, dampingFraction: 0.86), value: awake)
        }
        .onAppear {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.18) {
                awake = true
            }
        }
    }
}
