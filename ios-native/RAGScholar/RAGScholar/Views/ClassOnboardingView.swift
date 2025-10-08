//
//  ClassOnboardingView.swift
//  RAGScholar
//
//  App walkthrough and onboarding
//

import SwiftUI

struct ClassOnboardingView: View {
    @Environment(\.colorScheme) var colorScheme
    @State private var currentPage = 0
    @State private var showCreateClass = false

    let pages: [OnboardingPage] = [
        OnboardingPage(
            icon: "book.fill",
            title: "Welcome to RAG Scholar",
            description: "Your AI-powered study assistant that helps you learn from your documents",
            color: Color.purple
        ),
        OnboardingPage(
            icon: "folder.fill",
            title: "Create Classes",
            description: "Organize your documents by subject or topic. Create unlimited classes for all your courses.",
            color: Color.blue
        ),
        OnboardingPage(
            icon: "doc.fill",
            title: "Upload Documents",
            description: "Add PDFs, notes, and study materials. RAG Scholar will analyze them to help you learn.",
            color: Color.green
        ),
        OnboardingPage(
            icon: "message.fill",
            title: "Ask Questions",
            description: "Chat with your documents! Get instant answers with citations from your uploaded materials.",
            color: Color.orange
        ),
        OnboardingPage(
            icon: "star.fill",
            title: "Track Progress",
            description: "Earn achievements, track your study sessions, and see your learning journey unfold.",
            color: Color.pink
        )
    ]

    var body: some View {
        ZStack {
            // Background
            (colorScheme == .dark ?
                Color(red: 0.05, green: 0.05, blue: 0.05) :
                Color(red: 0.98, green: 0.98, blue: 0.98))
                .ignoresSafeArea()

            VStack(spacing: 0) {
                // Skip button
                HStack {
                    Spacer()
                    if currentPage < pages.count - 1 {
                        Button("Skip") {
                            currentPage = pages.count - 1
                        }
                        .font(.system(size: 16))
                        .foregroundColor(.purple)
                        .padding()
                    }
                }

                // Page content
                TabView(selection: $currentPage) {
                    ForEach(0..<pages.count, id: \.self) { index in
                        OnboardingPageView(page: pages[index])
                            .tag(index)
                    }
                }
                .tabViewStyle(.page(indexDisplayMode: .never))

                // Page indicators
                HStack(spacing: 8) {
                    ForEach(0..<pages.count, id: \.self) { index in
                        Circle()
                            .fill(currentPage == index ? Color.purple : Color.gray.opacity(0.3))
                            .frame(width: 8, height: 8)
                            .animation(.easeInOut, value: currentPage)
                    }
                }
                .padding(.bottom, 20)

                // Action button
                if currentPage == pages.count - 1 {
                    Button(action: {
                        showCreateClass = true
                    }) {
                        Text("Get Started")
                            .font(.system(size: 17, weight: .semibold))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(
                                LinearGradient(
                                    colors: [Color.blue, Color.purple],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .cornerRadius(16)
                    }
                    .padding(.horizontal, 32)
                    .padding(.bottom, 40)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                } else {
                    Button(action: {
                        withAnimation {
                            currentPage += 1
                        }
                    }) {
                        HStack {
                            Text("Next")
                                .font(.system(size: 17, weight: .semibold))
                            Image(systemName: "arrow.right")
                                .font(.system(size: 16, weight: .semibold))
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(
                            LinearGradient(
                                colors: [Color.blue, Color.purple],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .cornerRadius(16)
                    }
                    .padding(.horizontal, 32)
                    .padding(.bottom, 40)
                }
            }
        }
        .sheet(isPresented: $showCreateClass) {
            CreateClassView()
        }
    }
}

struct OnboardingPage {
    let icon: String
    let title: String
    let description: String
    let color: Color
}

struct OnboardingPageView: View {
    let page: OnboardingPage
    @Environment(\.colorScheme) var colorScheme

    var body: some View {
        VStack(spacing: 32) {
            Spacer()

            // Icon with background
            ZStack {
                Circle()
                    .fill(page.color.opacity(0.15))
                    .frame(width: 140, height: 140)

                Image(systemName: page.icon)
                    .font(.system(size: 60))
                    .foregroundColor(page.color)
            }
            .padding(.top, 40)

            VStack(spacing: 16) {
                // Title
                Text(page.title)
                    .font(.system(size: 28, weight: .bold))
                    .foregroundColor(colorScheme == .dark ? .white : .black)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)

                // Description
                Text(page.description)
                    .font(.system(size: 17))
                    .foregroundColor(colorScheme == .dark ? .white.opacity(0.7) : .black.opacity(0.6))
                    .multilineTextAlignment(.center)
                    .lineSpacing(4)
                    .padding(.horizontal, 40)
            }

            Spacer()
            Spacer()
        }
    }
}

#Preview("Light Mode") {
    ClassOnboardingView()
        .preferredColorScheme(.light)
}

#Preview("Dark Mode") {
    ClassOnboardingView()
        .preferredColorScheme(.dark)
}
