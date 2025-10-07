//
//  HomeView.swift
//  RAGScholar
//
//  Home screen with greeting, learning progress, and recent chats
//

import SwiftUI

struct HomeView: View {
    @EnvironmentObject var classManager: ClassManager
    @EnvironmentObject var chatManager: ChatManager
    @EnvironmentObject var rewardsManager: RewardsManager
    @EnvironmentObject var navigationManager: NavigationManager

    @State private var isEditingSession: ChatSession?
    @State private var editedSessionName: String = ""

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                // Greeting with heart icon
                HStack(alignment: .top, spacing: 12) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text(greetingText)
                            .font(.system(size: 34, weight: .bold))
                            .foregroundColor(.white)

                        if let userName = getUserName() {
                            Text(userName)
                                .font(.system(size: 28, weight: .semibold))
                                .foregroundColor(.white.opacity(0.8))
                        }
                    }

                    Spacer()

                    Image(systemName: "heart.fill")
                        .font(.title)
                        .foregroundColor(.pink)
                        .symbolEffect(.pulse)
                }
                .padding(.horizontal)
                .padding(.top, 8)

                // Learning Progress Card
                if let stats = rewardsManager.userStats {
                    LearningProgressCard(stats: stats)
                        .padding(.horizontal)
                        .onTapGesture {
                            navigationManager.selectedTab = .rewards
                            HapticManager.shared.lightTap()
                        }
                }

                // Recent Chats Section
                VStack(alignment: .leading, spacing: 16) {
                    HStack {
                        Text("Recent Chats")
                            .font(.system(size: 22, weight: .bold))
                            .foregroundColor(.white)

                        if let activeClass = classManager.activeClass {
                            Text("- \(activeClass.name)")
                                .font(.system(size: 18, weight: .medium))
                                .foregroundColor(.white.opacity(0.6))
                        }

                        Spacer()

                        Button(action: {
                            chatManager.startNewChat()
                            navigationManager.selectedTab = .chat
                        }) {
                            HStack(spacing: 4) {
                                Image(systemName: "plus")
                                Text("New Chat")
                            }
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundColor(.white)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(
                                LinearGradient(
                                    colors: [Color(red: 0.43, green: 0.37, blue: 0.99), Color(red: 0.62, green: 0.47, blue: 1)],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .cornerRadius(20)
                        }
                    }
                    .padding(.horizontal)

                    // Chat List
                    let recentChats = chatManager.getRecentSessions(for: classManager.activeClass?.id, limit: 5)

                    if recentChats.isEmpty {
                        EmptyChatState()
                            .padding(.horizontal)
                    } else {
                        ForEach(recentChats) { session in
                            ChatListItem(
                                session: session,
                                isEditing: isEditingSession?.id == session.id,
                                editedName: $editedSessionName,
                                onTap: {
                                    Task {
                                        await chatManager.loadSession(session.id)
                                        navigationManager.selectedTab = .chat
                                    }
                                },
                                onEdit: {
                                    isEditingSession = session
                                    editedSessionName = session.name
                                },
                                onSaveEdit: {
                                    // TODO: Implement session name update API
                                    isEditingSession = nil
                                },
                                onDelete: {
                                    Task {
                                        await chatManager.deleteSession(session.id)
                                    }
                                }
                            )
                            .padding(.horizontal)
                        }
                    }
                }
                .padding(.bottom, 100) // Extra padding for tab bar
            }
            .padding(.vertical)
        }
        .onAppear {
            Task {
                await rewardsManager.fetchUserStats()
                await chatManager.fetchSessions(for: classManager.activeClass?.id)
            }
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

    private func getUserName() -> String? {
        // TODO: Get from AuthenticationManager when implemented
        return nil
    }
}

// MARK: - Learning Progress Card

struct LearningProgressCard: View {
    let stats: UserStats

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Image(systemName: "star.fill")
                    .font(.title)
                    .foregroundColor(.yellow)
                    .symbolEffect(.pulse)

                VStack(alignment: .leading, spacing: 4) {
                    Text("\(stats.totalPoints) points")
                        .font(.system(size: 28, weight: .bold))
                        .foregroundColor(.white)

                    Text("\(stats.achievementsUnlocked) of \(stats.totalAchievements) achievements")
                        .font(.system(size: 14))
                        .foregroundColor(.white.opacity(0.7))
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .foregroundColor(.white.opacity(0.5))
            }

            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text("Progress to next achievement")
                        .font(.system(size: 13))
                        .foregroundColor(.white.opacity(0.7))

                    Spacer()

                    Text("\(stats.totalPoints) / \(stats.nextMilestonePoints)")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(.white)
                }

                GeometryReader { geometry in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 4)
                            .fill(Color.white.opacity(0.2))
                            .frame(height: 8)

                        RoundedRectangle(cornerRadius: 4)
                            .fill(
                                LinearGradient(
                                    colors: [Color.yellow, Color.orange],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .frame(width: geometry.size.width * stats.progressToNextMilestone, height: 8)
                            .animation(.easeInOut, value: stats.progressToNextMilestone)
                    }
                }
                .frame(height: 8)
            }
        }
        .padding(20)
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(
                    LinearGradient(
                        colors: [
                            Color(red: 0.43, green: 0.37, blue: 0.99).opacity(0.3),
                            Color(red: 0.62, green: 0.47, blue: 1).opacity(0.3)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 20)
                        .stroke(Color.white.opacity(0.1), lineWidth: 1)
                )
        )
    }
}

// MARK: - Chat List Item

struct ChatListItem: View {
    let session: ChatSession
    let isEditing: Bool
    @Binding var editedName: String
    let onTap: () -> Void
    let onEdit: () -> Void
    let onSaveEdit: () -> Void
    let onDelete: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "bubble.left.fill")
                .font(.title3)
                .foregroundColor(.purple.opacity(0.8))

            if isEditing {
                TextField("Chat name", text: $editedName)
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(.white)
                    .onSubmit {
                        onSaveEdit()
                    }
            } else {
                VStack(alignment: .leading, spacing: 4) {
                    Text(session.name)
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(.white)
                        .lineLimit(1)

                    HStack(spacing: 12) {
                        Label("\(session.messageCount)", systemImage: "message")

                        Text(formatTimestamp(session.updatedAt))
                    }
                    .font(.system(size: 13))
                    .foregroundColor(.white.opacity(0.6))
                }
            }

            Spacer()

            if !isEditing {
                Image(systemName: "chevron.right")
                    .font(.system(size: 14))
                    .foregroundColor(.white.opacity(0.3))
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.white.opacity(0.05))
        )
        .contentShape(Rectangle())
        .onTapGesture {
            if !isEditing {
                onTap()
            }
        }
        .swipeActions(edge: .trailing, allowsFullSwipe: false) {
            Button(role: .destructive, action: onDelete) {
                Label("Delete", systemImage: "trash")
            }

            Button(action: onEdit) {
                Label("Edit", systemImage: "pencil")
            }
            .tint(.blue)
        }
    }

    private func formatTimestamp(_ date: Date) -> String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter.localizedString(for: date, relativeTo: Date())
    }
}

// MARK: - Empty State

struct EmptyChatState: View {
    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "bubble.left.and.bubble.right")
                .font(.system(size: 48))
                .foregroundColor(.white.opacity(0.3))

            Text("No chats yet")
                .font(.system(size: 18, weight: .medium))
                .foregroundColor(.white.opacity(0.6))

            Text("Start a new chat to begin learning")
                .font(.system(size: 14))
                .foregroundColor(.white.opacity(0.4))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
    }
}

#Preview {
    HomeView()
        .environmentObject(ClassManager.shared)
        .environmentObject(ChatManager.shared)
        .environmentObject(RewardsManager.shared)
        .environmentObject(NavigationManager.shared)
        .background(Color.black)
}
