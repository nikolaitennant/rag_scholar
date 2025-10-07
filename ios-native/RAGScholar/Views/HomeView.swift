//
//  HomeView.swift
//  RAGScholar
//
//  Home screen with greeting and quick actions
//

import SwiftUI

struct HomeView: View {
    @EnvironmentObject var classManager: ClassManager

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                // Greeting
                VStack(alignment: .leading, spacing: 8) {
                    Text(greetingText)
                        .font(.largeTitle)
                        .fontWeight(.bold)
                        .foregroundColor(.white)

                    Text("Ready to explore your documents?")
                        .font(.subheadline)
                        .foregroundColor(.white.opacity(0.7))
                }
                .padding(.horizontal)
                .padding(.top, 8)

                // Active Class Card
                if let activeClass = classManager.activeClass {
                    ActiveClassCard(userClass: activeClass)
                        .padding(.horizontal)
                }

                // Recent Activity placeholder
                Text("Recent Activity")
                    .font(.headline)
                    .foregroundColor(.white)
                    .padding(.horizontal)

                // Placeholder cards
                ForEach(0..<3, id: \.self) { _ in
                    PlaceholderCard()
                        .padding(.horizontal)
                }
            }
            .padding(.vertical)
        }
    }

    private var greetingText: String {
        let hour = Calendar.current.component(.hour, from: Date())
        if hour < 12 {
            return "Good morning"
        } else if hour < 17 {
            return "Good afternoon"
        } else {
            return "Good evening"
        }
    }
}

struct ActiveClassCard: View {
    let userClass: UserClass

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: userClass.domainType.icon)
                    .font(.title2)
                Text(userClass.name)
                    .font(.headline)
                Spacer()
            }
            .foregroundColor(.white)

            Text(userClass.domainType.displayName)
                .font(.subheadline)
                .foregroundColor(.white.opacity(0.6))
        }
        .padding()
        .background(
            LinearGradient(
                colors: [Color(red: 0.43, green: 0.37, blue: 0.99).opacity(0.3), Color(red: 0.62, green: 0.47, blue: 1).opacity(0.3)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .cornerRadius(16)
        )
    }
}

struct PlaceholderCard: View {
    var body: some View {
        RoundedRectangle(cornerRadius: 16)
            .fill(Color.white.opacity(0.05))
            .frame(height: 100)
    }
}

#Preview {
    HomeView()
        .environmentObject(ClassManager.shared)
        .background(Color.black)
}
