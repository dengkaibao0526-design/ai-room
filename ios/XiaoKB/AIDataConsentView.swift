import SwiftUI

struct AIDataConsentView: View {
    let onAgree: () -> Void

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [
                    Color(red: 0.03, green: 0.02, blue: 0.06),
                    Color(red: 0.055, green: 0.025, blue: 0.10),
                    Color(red: 0.02, green: 0.015, blue: 0.04)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            VStack(alignment: .leading, spacing: 22) {
                Spacer()

                Text("KB")
                    .font(.system(size: 20, weight: .bold, design: .rounded))
                    .foregroundStyle(.white)
                    .frame(width: 58, height: 58)
                    .background(
                        RoundedRectangle(cornerRadius: 18, style: .continuous)
                            .fill(
                                LinearGradient(
                                    colors: [Color(red: 0.72, green: 0.52, blue: 1.0), Color(red: 0.33, green: 0.15, blue: 0.75)],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                    )
                    .shadow(color: Color.purple.opacity(0.42), radius: 26)

                Text("先说清楚一件事")
                    .font(.system(size: 31, weight: .semibold, design: .rounded))
                    .foregroundStyle(.white)

                Text("你发给小KB的聊天内容，会通过小KB的服务发送给第三方 AI 服务提供商 DeepSeek，用于生成回复。")
                    .font(.system(size: 17, weight: .regular))
                    .foregroundStyle(Color.white.opacity(0.78))
                    .lineSpacing(5)

                VStack(alignment: .leading, spacing: 12) {
                    ConsentRow(text: "聊天内容用于生成 AI 回复")
                    ConsentRow(text: "设备方向数据只用于本机视觉效果，不作为聊天内容发送")
                    ConsentRow(text: "记忆中心里的内容由你主动保存和管理")
                }

                Text("继续即表示你同意上述 AI 数据处理方式。你可以在小KB内查看隐私说明。")
                    .font(.system(size: 13))
                    .foregroundStyle(Color.white.opacity(0.48))
                    .lineSpacing(3)

                Button(action: onAgree) {
                    Text("同意并进入小KB")
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 54)
                        .background(
                            RoundedRectangle(cornerRadius: 17, style: .continuous)
                                .fill(
                                    LinearGradient(
                                        colors: [Color(red: 0.52, green: 0.28, blue: 0.95), Color(red: 0.34, green: 0.16, blue: 0.76)],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                        )
                        .shadow(color: Color.purple.opacity(0.24), radius: 22, y: 10)
                }
                .buttonStyle(.plain)

                Spacer()
                    .frame(height: 18)
            }
            .padding(.horizontal, 28)
        }
    }
}

private struct ConsentRow: View {
    let text: String

    var body: some View {
        HStack(alignment: .top, spacing: 11) {
            Circle()
                .fill(Color(red: 0.65, green: 0.42, blue: 1.0))
                .frame(width: 6, height: 6)
                .padding(.top, 7)

            Text(text)
                .font(.system(size: 15))
                .foregroundStyle(Color.white.opacity(0.72))
                .lineSpacing(3)
        }
    }
}
