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
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 8) {
                        Text(greetingTextWithUsername)
                            .font(.system(size: 28, weight: .semibold, design: .default))
                            .foregroundColor(.white)
                        
                        Image(systemName: "suit.heart")
                            .font(.system(size: 22, weight: .medium))
                            .foregroundColor(Color(red: 0.4, green: 0.2, blue: 0.8)) // Dark violet
                            .baselineOffset(1)
                    }
                    
                    Text("Ready to explore your documents?")
                        .font(.system(size: 15, weight: .regular, design: .default))
                        .foregroundColor(.white.opacity(0.55))
                }
                .padding(.horizontal)
                .padding(.top, 8)

                // Learning Progress Card
                if let stats = rewardsManager.userStats {
                    LearningProgressCard(stats: stats)
                        .padding(.horizontal)
                        .onTapGesture {
                            navigationManager.selectedTab = .rewards
                            HapticManager.shared.impact(.light)
                        }
                }

                // Recent Chats Section
                VStack(alignment: .leading, spacing: 16) {
                    HStack {
                        Text("Recent Chats")
                            .font(.system(size: 22, weight: .bold))
                            .foregroundColor(.white)

                        Spacer()

                        Button(action: {
                            chatManager.startNewChat()
                            navigationManager.selectedTab = .chat
                            HapticManager.shared.impact(.light)
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
                                    colors: [
                                        Color(red: 0.43, green: 0.37, blue: 0.99),
                                        Color(red: 0.62, green: 0.47, blue: 1)
                                    ],
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
        .background(Color(red: 0.11, green: 0.11, blue: 0.11)) // Same as header - slightly lighter
        .onAppear {
            Task {
                await rewardsManager.fetchUserStats()
                await chatManager.fetchSessions(for: classManager.activeClass?.id)
            }
        }
    }

    private var greetingTextWithUsername: String {
        let hour = Calendar.current.component(.hour, from: Date())
        let greeting: String
        if hour < 12 {
            greeting = "Good morning"
        } else if hour < 17 {
            greeting = "Good afternoon"  
        } else {
            greeting = "Good evening"
        }
        
        if let userName = getUserName() {
            return "\(greeting), \(userName)"
        } else {
            return greeting
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
            // Header with title and star/points in top right
            HStack {
                Text("Learning Progress")
                    .font(.system(size: 17, weight: .semibold, design: .default))
                    .foregroundColor(.white)
                
                Spacer()
                
                HStack(spacing: 4) {
                    Image(systemName: "star.fill")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(.yellow)
                        .shadow(color: .yellow.opacity(0.6), radius: 4, x: 0, y: 0) // Yellow glow
                    
                    Text("\(stats.totalPoints) pts")
                        .font(.system(size: 15, weight: .semibold, design: .default))
                        .foregroundColor(.white)
                }
            }
            
            // Next achievement and progress
            VStack(alignment: .leading, spacing: 8) {
                // Next achievement line with progress on far right
                HStack {
                    Text("Next: \(getNextAchievementName())")
                        .font(.system(size: 14, weight: .regular, design: .default))
                        .foregroundColor(.white.opacity(0.65))
                    
                    Spacer()
                    
                    Text("(\(stats.achievementsUnlocked)/\(stats.totalAchievements))")
                        .font(.system(size: 14, weight: .regular, design: .default))
                        .foregroundColor(.white.opacity(0.65))
                }
                
                // Progress Bar
                GeometryReader { geometry in
                    ZStack(alignment: .leading) {
                        // Track
                        RoundedRectangle(cornerRadius: 3)
                            .fill(Color(red: 0.16, green: 0.16, blue: 0.18)) // #2A2A2D
                            .frame(height: 6)
                        
                        // Progress Fill - blueish to purple gradient
                        RoundedRectangle(cornerRadius: 3)
                            .fill(
                                LinearGradient(
                                    colors: [
                                        Color(red: 0.3, green: 0.6, blue: 1.0), // Light blue
                                        Color(red: 0.6, green: 0.4, blue: 1.0)  // Light purple
                                    ],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .frame(width: geometry.size.width * stats.progressToNextMilestone, height: 6)
                            .animation(.easeInOut(duration: 0.3), value: stats.progressToNextMilestone)
                    }
                }
                .frame(height: 6)
            }
        }
        .padding(20)
        .background(Color(red: 0.11, green: 0.11, blue: 0.12)) // #1C1C1E
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.white.opacity(0.1), lineWidth: 1) // Light grey faint border
        )
        .shadow(color: .black.opacity(0.3), radius: 8, x: 0, y: 4) // Depth effect - outer shadow
        .shadow(color: .white.opacity(0.02), radius: 1, x: 0, y: -1) // Depth effect - inner highlight
    }
    
    private func getNextAchievementName() -> String {
        // This should be populated from backend data
        // For now, return a placeholder that indicates it should be dynamic
        return "Consistent Researcher"
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
