//
//  HomeView.swift
//  RAGScholar
//
//  Home screen with greeting, learning progress, and recent chats
//

import SwiftUI
import FirebaseAuth

struct HomeView: View {
    @EnvironmentObject var classManager: ClassManager
    @EnvironmentObject var chatManager: ChatManager
    @EnvironmentObject var rewardsManager: RewardsManager
    @EnvironmentObject var navigationManager: NavigationManager
    @EnvironmentObject var authManager: AuthenticationManager
    @Environment(\.colorScheme) var colorScheme

    @State private var isEditingSession: ChatSession?
    @State private var editedSessionName: String = ""
    @State private var heartOpacity: Double = 1.0
    @State private var showSettings = false
    @State private var searchText = ""
    @State private var isSearchActive = false
    @State private var showManageClasses = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                // Greeting with heart icon
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 8) {
                        Text(greetingTextWithUsername)
                            .font(.system(size: 28, weight: .semibold, design: .default))
                            .foregroundColor(colorScheme == .dark ? .white : .black)

                        Image(systemName: "suit.heart")
                            .font(.system(size: 20, weight: .medium))
                            .foregroundColor(Color(red: 0.64, green: 0.47, blue: 1.0)) // Violet-400
                            .offset(y: 2)
                            .opacity(heartOpacity)
                            .onAppear {
                                withAnimation(
                                    Animation.easeInOut(duration: 2.0)
                                        .repeatForever(autoreverses: true)
                                ) {
                                    heartOpacity = 0.5
                                }
                            }
                    }

                    Text("Ready to explore your documents?")
                        .font(.system(size: 15, weight: .regular, design: .default))
                        .foregroundColor(colorScheme == .dark ? .white.opacity(0.55) : .black.opacity(0.5))
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
                            .foregroundColor(colorScheme == .dark ? .white : .black)

                        Spacer()

                        GlassEffectContainer {
                            Button(action: {
                                chatManager.startNewChat()
                                navigationManager.selectedTab = .chat
                                HapticManager.shared.impact(.light)
                            }) {
                                Image(systemName: "square.and.pencil")
                                    .font(.system(size: 16))
                                    .foregroundColor(colorScheme == .dark ? .white : .black)
                                    .padding(10)
                            }
                            .glassEffect(in: Circle())
                        }
                    }
                    .padding(.horizontal)

                    // Chat List
                    let recentChats = filteredChats

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
        .background(colorScheme == .dark ? Color(red: 0.11, green: 0.11, blue: 0.11) : Color.white)
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(colorScheme == .dark ? Color(red: 0.11, green: 0.11, blue: 0.11) : .white, for: .navigationBar)
        .toolbarBackground(.visible, for: .navigationBar)
        .toolbarColorScheme(colorScheme == .dark ? .dark : .light, for: .navigationBar)
        .toolbar {
            if isSearchActive {
                // Search mode - hide default items
                ToolbarItem(placement: .principal) {
                    HStack(spacing: 8) {
                        GlassEffectContainer {
                            HStack(spacing: 0) {
                                Image(systemName: "magnifyingglass")
                                    .font(.system(size: 16, weight: .medium))
                                    .foregroundColor(colorScheme == .dark ? .white.opacity(0.6) : .black.opacity(0.5))
                                    .padding(.leading, 16)

                                TextField("Search chats...", text: $searchText)
                                    .textFieldStyle(.plain)
                                    .font(.system(size: 17, weight: .regular))
                                    .foregroundColor(colorScheme == .dark ? .white : .black)
                                    .tint(Color(red: 0.61, green: 0.42, blue: 1.0))
                                    .padding(.horizontal, 12)

                                if !searchText.isEmpty {
                                    Button {
                                        searchText = ""
                                    } label: {
                                        Image(systemName: "xmark.circle.fill")
                                            .font(.system(size: 16))
                                            .foregroundColor(colorScheme == .dark ? .white.opacity(0.6) : .black.opacity(0.5))
                                    }
                                    .padding(.trailing, 16)
                                } else {
                                    Spacer()
                                        .frame(width: 16)
                                }
                            }
                            .padding(.vertical, 10)
                            .glassEffect(in: Capsule())
                        }
                        .frame(minWidth: 0, maxWidth: .infinity)
                    }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        withAnimation {
                            isSearchActive = false
                            searchText = ""
                        }
                    } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 16))
                            .foregroundColor(colorScheme == .dark ? .white : .black)
                    }
                }
            } else {
                // Normal mode - class dropdown, search icon, settings
                ToolbarItem(placement: .topBarLeading) {
                    Menu {
                        ForEach(classManager.classes) { userClass in
                            Button(action: {
                                classManager.selectClass(userClass)
                            }) {
                                HStack {
                                    Text(userClass.name)
                                    if classManager.activeClass?.id == userClass.id {
                                        Image(systemName: "checkmark")
                                    }
                                }
                            }
                        }

                        Divider()

                        Button(action: {
                            showManageClasses = true
                        }) {
                            Label("Manage Classes", systemImage: "folder.badge.gearshape")
                        }
                    } label: {
                        HStack(spacing: 4) {
                            Text(classManager.activeClass?.name ?? "Select Class")
                                .font(.system(size: 15))
                                .foregroundColor(colorScheme == .dark ? .white : .black)
                                .lineLimit(1)
                            Image(systemName: "chevron.down")
                                .font(.system(size: 12))
                                .foregroundColor(colorScheme == .dark ? .white : .black)
                        }
                    }
                }

                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        withAnimation {
                            isSearchActive = true
                        }
                    } label: {
                        Image(systemName: "magnifyingglass")
                            .font(.system(size: 16))
                            .foregroundColor(colorScheme == .dark ? .white : .black)
                    }
                }

                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showSettings = true
                    } label: {
                        Image(systemName: "gearshape.fill")
                            .font(.system(size: 16))
                            .foregroundColor(colorScheme == .dark ? .white : .black)
                    }
                }
            }
        }
        .sheet(isPresented: $showSettings) {
            SettingsView()
        }
        .sheet(isPresented: $showManageClasses) {
            ManageClassesView()
        }
        .onAppear {
            Task {
                await rewardsManager.fetchUserStats()
                await chatManager.fetchSessions(for: classManager.activeClass?.id)
            }
        }
    }

    private var filteredChats: [ChatSession] {
        let allChats = chatManager.getRecentSessions(for: classManager.activeClass?.id, limit: 100)

        if searchText.isEmpty {
            return Array(allChats.prefix(5))
        }

        return allChats.filter { session in
            session.name.localizedCaseInsensitiveContains(searchText)
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
        if let displayName = authManager.user?.displayName {
            return displayName
        } else if let email = authManager.user?.email {
            return email.split(separator: "@").first.map(String.init)
        }
        return nil
    }
}

// MARK: - Learning Progress Card

struct LearningProgressCard: View {
    let stats: UserStats
    @Environment(\.colorScheme) var colorScheme

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Header with title and star/points in top right
            HStack {
                Text("Learning Progress")
                    .font(.system(size: 17, weight: .semibold, design: .default))
                    .foregroundColor(colorScheme == .dark ? .white : .black)
                
                Spacer()
                
                HStack(spacing: 4) {
                    Image(systemName: "star.fill")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(.yellow)
                        .shadow(color: .yellow.opacity(0.6), radius: 4, x: 0, y: 0) // Yellow glow
                    
                    Text("\(stats.totalPoints) pts")
                        .font(.system(size: 15, weight: .semibold, design: .default))
                        .foregroundColor(colorScheme == .dark ? .white : .black)
                }
            }
            
            // Next achievement and progress
            VStack(alignment: .leading, spacing: 8) {
                // Next achievement line with achievements unlocked on far right
                HStack {
                    Text("Next: \(getNextAchievementName())")
                        .font(.system(size: 14, weight: .regular, design: .default))
                        .foregroundColor(colorScheme == .dark ? .white.opacity(0.65) : .black.opacity(0.6))

                    Spacer()

                    Text("\(stats.achievementsUnlocked)/\(stats.totalAchievements) achievements")
                        .font(.system(size: 14, weight: .regular, design: .default))
                        .foregroundColor(colorScheme == .dark ? .white.opacity(0.65) : .black.opacity(0.6))
                }

                // Progress Bar - shows total points out of all possible points
                GeometryReader { geometry in
                    ZStack(alignment: .leading) {
                        // Track
                        RoundedRectangle(cornerRadius: 3)
                            .fill(Color(red: 0.16, green: 0.16, blue: 0.18)) // #2A2A2D
                            .frame(height: 6)

                        // Progress Fill - blueish to purple gradient based on total points
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
                            .frame(width: geometry.size.width * stats.progressToTotalPoints, height: 6)
                            .animation(.easeInOut(duration: 0.3), value: stats.progressToTotalPoints)
                    }
                }
                .frame(height: 6)
            }
        }
        .padding(20)
        .background(colorScheme == .dark ? Color(red: 0.11, green: 0.11, blue: 0.12) : Color.white)
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
    @Environment(\.colorScheme) var colorScheme

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "bubble.left.fill")
                .font(.title3)
                .foregroundColor(.purple.opacity(0.8))

            if isEditing {
                TextField("Chat name", text: $editedName)
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(colorScheme == .dark ? .white : .black)
                    .onSubmit {
                        onSaveEdit()
                    }
            } else {
                VStack(alignment: .leading, spacing: 4) {
                    Text(session.name)
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(colorScheme == .dark ? .white : .black)
                        .lineLimit(1)

                    HStack(spacing: 12) {
                        if let count = session.messageCount {
                            Label("\(count)", systemImage: "message")
                        }

                        if let updatedAt = session.updatedAt {
                            Text(updatedAt)
                        }
                    }
                    .font(.system(size: 13))
                    .foregroundColor(colorScheme == .dark ? .white.opacity(0.6) : .black.opacity(0.5))
                }
            }

            Spacer()

            if !isEditing {
                Image(systemName: "chevron.right")
                    .font(.system(size: 14))
                    .foregroundColor(colorScheme == .dark ? .white.opacity(0.3) : .black.opacity(0.25))
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(colorScheme == .dark ? Color.white.opacity(0.05) : Color.black.opacity(0.03))
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
    @Environment(\.colorScheme) var colorScheme

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "bubble.left.and.bubble.right")
                .font(.system(size: 48))
                .foregroundColor(colorScheme == .dark ? .white.opacity(0.3) : .black.opacity(0.25))

            Text("No chats yet")
                .font(.system(size: 18, weight: .medium))
                .foregroundColor(colorScheme == .dark ? .white.opacity(0.6) : .black.opacity(0.5))

            Text("Start a new chat to begin learning")
                .font(.system(size: 14))
                .foregroundColor(colorScheme == .dark ? .white.opacity(0.4) : .black.opacity(0.35))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
    }
}

#Preview("Dark Mode") {
    HomeView()
        .environmentObject(ClassManager.shared)
        .environmentObject(ChatManager.shared)
        .environmentObject(RewardsManager.shared)
        .environmentObject(NavigationManager.shared)
        .preferredColorScheme(.dark)
}

#Preview("Light Mode") {
    HomeView()
        .environmentObject(ClassManager.shared)
        .environmentObject(ChatManager.shared)
        .environmentObject(RewardsManager.shared)
        .environmentObject(NavigationManager.shared)
        .preferredColorScheme(.light)
}
