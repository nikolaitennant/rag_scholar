//
//  ClassOnboardingView.swift
//  RAGScholar
//
//  First-time class onboarding
//

import SwiftUI

struct ClassOnboardingView: View {
    var body: some View {
        ZStack {
            // Background gradient
            LinearGradient(
                colors: [
                    Color(red: 0.1, green: 0.1, blue: 0.18),
                    Color(red: 0.09, green: 0.13, blue: 0.25),
                    Color(red: 0.06, green: 0.2, blue: 0.38)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            VStack(spacing: 24) {
                Spacer()

                // Icon
                ZStack {
                    Circle()
                        .fill(
                            LinearGradient(
                                colors: [Color(red: 0.43, green: 0.37, blue: 0.99), Color(red: 0.62, green: 0.47, blue: 1)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 100, height: 100)

                    Image(systemName: "book.fill")
                        .font(.system(size: 50))
                        .foregroundColor(.white)
                }

                // Title
                Text("Welcome to RAG Scholar")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                    .multilineTextAlignment(.center)

                // Subtitle
                Text("Create your first class to get started")
                    .font(.body)
                    .foregroundColor(.white.opacity(0.7))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 40)

                Spacer()

                // CTA Button
                Button {
                    // TODO: Navigate to class creation
                } label: {
                    Text("Create Your First Class")
                        .fontWeight(.semibold)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(
                            LinearGradient(
                                colors: [Color(red: 0.43, green: 0.37, blue: 0.99), Color(red: 0.62, green: 0.47, blue: 1)],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .cornerRadius(16)
                }
                .padding(.horizontal, 40)
                .padding(.bottom, 40)
            }
        }
    }
}

#Preview {
    ClassOnboardingView()
}
