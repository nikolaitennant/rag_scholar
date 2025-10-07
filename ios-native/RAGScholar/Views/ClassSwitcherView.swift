//
//  ClassSwitcherView.swift
//  RAGScholar
//
//  Slack-style class switcher with native iOS design
//

import SwiftUI

struct ClassSwitcherView: View {
    @EnvironmentObject var classManager: ClassManager
    @EnvironmentObject var navigationManager: NavigationManager
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationStack {
            ZStack {
                // Background
                Color(red: 0.11, green: 0.11, blue: 0.12)
                    .ignoresSafeArea()

                if classManager.classes.isEmpty {
                    emptyStateView
                } else {
                    classListView
                }
            }
            .navigationTitle("Switch Class")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Close") {
                        dismiss()
                    }
                    .foregroundColor(.white)
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        // Navigate to create class
                    } label: {
                        Image(systemName: "plus")
                            .foregroundColor(.white)
                    }
                }
            }
        }
        .preferredColorScheme(.dark)
    }

    // MARK: - Empty State

    private var emptyStateView: some View {
        VStack(spacing: 20) {
            Image(systemName: "book.closed.fill")
                .font(.system(size: 60))
                .foregroundColor(.white.opacity(0.3))

            Text("No Classes Yet")
                .font(.title2)
                .fontWeight(.semibold)
                .foregroundColor(.white)

            Text("Create your first class to get started")
                .font(.subheadline)
                .foregroundColor(.white.opacity(0.6))
                .multilineTextAlignment(.center)

            Button {
                // Navigate to create class
                dismiss()
            } label: {
                Text("Create Your First Class")
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
                    .padding(.horizontal, 24)
                    .padding(.vertical, 12)
                    .background(
                        LinearGradient(
                            colors: [Color(red: 0.43, green: 0.37, blue: 0.99), Color(red: 0.62, green: 0.47, blue: 1)],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                        .cornerRadius(12)
                    )
            }
            .buttonStyle(.plain)
            .padding(.top, 8)
        }
        .padding()
    }

    // MARK: - Class List

    private var classListView: some View {
        ScrollView {
            VStack(spacing: 12) {
                ForEach(classManager.classes) { userClass in
                    ClassRowView(
                        userClass: userClass,
                        isActive: classManager.activeClass?.id == userClass.id
                    ) {
                        classManager.selectClass(userClass)
                        dismiss()
                    }
                }

                // Create New Class Button
                Button {
                    // Navigate to create class
                    dismiss()
                } label: {
                    HStack {
                        Image(systemName: "plus.circle.fill")
                            .font(.system(size: 24))
                            .foregroundColor(Color(red: 0.43, green: 0.37, blue: 0.99))

                        Text("New Class")
                            .font(.headline)
                            .foregroundColor(.white)

                        Spacer()
                    }
                    .padding()
                    .background(
                        Color.white.opacity(0.05)
                            .cornerRadius(16)
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(Color.white.opacity(0.1), lineWidth: 1)
                    )
                }
                .buttonStyle(.plain)
                .padding(.top, 8)
            }
            .padding()
        }
    }
}

// MARK: - Class Row

struct ClassRowView: View {
    let userClass: UserClass
    let isActive: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 16) {
                // Icon
                ZStack {
                    Circle()
                        .fill(
                            isActive ?
                            LinearGradient(
                                colors: [Color(red: 0.43, green: 0.37, blue: 0.99), Color(red: 0.62, green: 0.47, blue: 1)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ) :
                            LinearGradient(
                                colors: [Color.white.opacity(0.1), Color.white.opacity(0.1)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 48, height: 48)

                    Image(systemName: userClass.domainType.icon)
                        .font(.system(size: 22))
                        .foregroundColor(.white)
                }

                // Class Info
                VStack(alignment: .leading, spacing: 4) {
                    Text(userClass.name)
                        .font(.headline)
                        .foregroundColor(.white)

                    Text(userClass.domainType.displayName)
                        .font(.subheadline)
                        .foregroundColor(.white.opacity(0.5))
                }

                Spacer()

                // Active Indicator
                if isActive {
                    Image(systemName: "checkmark")
                        .font(.system(size: 18, weight: .bold))
                        .foregroundColor(Color(red: 0.43, green: 0.37, blue: 0.99))
                }
            }
            .padding()
            .background(
                (isActive ? Color(red: 0.43, green: 0.37, blue: 0.99).opacity(0.15) : Color.white.opacity(0.05))
                    .cornerRadius(16)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(
                        isActive ? Color(red: 0.43, green: 0.37, blue: 0.99).opacity(0.5) : Color.white.opacity(0.1),
                        lineWidth: isActive ? 2 : 1
                    )
            )
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    ClassSwitcherView()
        .environmentObject(ClassManager.shared)
        .environmentObject(NavigationManager.shared)
}
