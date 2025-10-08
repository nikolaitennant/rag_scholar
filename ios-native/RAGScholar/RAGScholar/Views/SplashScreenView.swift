//
//  SplashScreenView.swift
//  RAGScholar
//
//  Loading splash screen
//

import SwiftUI

struct SplashScreenView: View {
    @Environment(\.colorScheme) var colorScheme
    @State private var showContent = false
    @State private var animateDots = false

    var body: some View {
        ZStack {
            // Background - adapts to light/dark mode
            (colorScheme == .dark ? Color(red: 0.05, green: 0.05, blue: 0.05) : Color.white)
                .ignoresSafeArea()

            VStack(spacing: 24) {
                // Book icon with pulse animation
                Image(systemName: "book.open.fill")
                    .font(.system(size: 48))
                    .foregroundColor(colorScheme == .dark ? .white : .black)
                    .opacity(showContent ? 1 : 0)
                    .scaleEffect(showContent ? 1 : 0.9)
                    .animation(
                        Animation.easeOut(duration: 0.7)
                            .delay(0.1),
                        value: showContent
                    )

                // App name with gradient
                HStack(spacing: 0) {
                    Text("RAG Scholar")
                        .font(.system(size: 24, weight: .semibold))
                        .foregroundStyle(
                            LinearGradient(
                                colors: [
                                    Color(red: 0.55, green: 0.36, blue: 0.96),
                                    Color(red: 0.66, green: 0.33, blue: 0.97)
                                ],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )

                    // Animated dots
                    HStack(spacing: 2) {
                        ForEach(0..<3) { index in
                            Text(".")
                                .font(.system(size: 24, weight: .semibold))
                                .foregroundColor(colorScheme == .dark ? .white : .black)
                                .opacity(animateDots ? 1 : 0)
                                .animation(
                                    Animation.easeInOut(duration: 0.6)
                                        .repeatForever()
                                        .delay(Double(index) * 0.2),
                                    value: animateDots
                                )
                        }
                    }
                }
                .opacity(showContent ? 1 : 0)
                .offset(y: showContent ? 0 : 8)
                .animation(
                    Animation.easeOut(duration: 0.7)
                        .delay(0.2),
                    value: showContent
                )
            }
        }
        .onAppear {
            showContent = true
            animateDots = true
        }
    }
}

#Preview("Dark Mode") {
    SplashScreenView()
        .preferredColorScheme(.dark)
}

#Preview("Light Mode") {
    SplashScreenView()
        .preferredColorScheme(.light)
}
