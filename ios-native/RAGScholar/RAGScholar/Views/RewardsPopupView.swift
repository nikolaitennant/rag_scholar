//
//  RewardsPopupView.swift
//  RAGScholar
//
//  Rewards popup modal displayed when clicking learning progress
//

import SwiftUI

struct RewardsPopupView: View {
    @EnvironmentObject var rewardsManager: RewardsManager
    @Environment(\.dismiss) var dismiss
    @Environment(\.colorScheme) var colorScheme

    @State private var selectedTab = 0

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Segmented Control
                Picker("View", selection: $selectedTab) {
                    Text("Achievements").tag(0)
                    Text("Store").tag(1)
                }
                .pickerStyle(SegmentedPickerStyle())
                .padding(.horizontal, 80)
                .padding(.vertical, 12)
                .background(colorScheme == .dark ? Color(red: 0.11, green: 0.11, blue: 0.11) : Color.white)

                // Content
                ScrollView {
                    if selectedTab == 0 {
                        AchievementsGrid()
                            .padding()
                            .padding(.bottom, 80)
                    } else {
                        StoreComingSoon()
                            .padding()
                            .padding(.bottom, 80)
                    }
                }
                .background(colorScheme == .dark ? Color(red: 0.11, green: 0.11, blue: 0.11) : Color.white)
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(colorScheme == .dark ? Color(red: 0.11, green: 0.11, blue: 0.11) : Color.white, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Text("Rewards")
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundColor(colorScheme == .dark ? .white : .black)
                }

                ToolbarItem(placement: .navigationBarLeading) {
                    if let stats = rewardsManager.userStats {
                        HStack(spacing: 4) {
                            Image(systemName: "star.fill")
                                .font(.system(size: 14))
                                .foregroundColor(.yellow)

                            Text("\(stats.totalPoints) pts")
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundColor(colorScheme == .dark ? .white : .black)
                                .fixedSize()
                        }
                    }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 16))
                            .foregroundColor(colorScheme == .dark ? .white : .black)
                    }
                }
            }
            .onAppear {
                Task {
                    await rewardsManager.fetchAchievements()
                    await rewardsManager.fetchUserStats()
                }
            }
            .overlay(
                // Achievement Notification
                Group {
                    if let achievement = rewardsManager.showAchievementNotification {
                        AchievementNotificationView(achievement: achievement) {
                            rewardsManager.dismissAchievementNotification()
                        }
                        .transition(.move(edge: .top).combined(with: .opacity))
                    }
                }
                .animation(.spring(), value: rewardsManager.showAchievementNotification)
            )
        }
    }
}

// MARK: - Achievements Grid

struct AchievementsGrid: View {
    @EnvironmentObject var rewardsManager: RewardsManager
    @Environment(\.colorScheme) var colorScheme

    let columns = [
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12)
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            // In Progress Section
            if !rewardsManager.lockedAchievements.isEmpty {
                VStack(alignment: .leading, spacing: 12) {
                    Text("In Progress")
                        .font(.system(size: 20, weight: .bold))
                        .foregroundColor(colorScheme == .dark ? .white : .black)
                        .padding(.horizontal)

                    GlassEffectContainer(spacing: 16) {
                        LazyVGrid(columns: columns, spacing: 12) {
                            ForEach(rewardsManager.lockedAchievements) { achievement in
                                AchievementCard(achievement: achievement)
                            }
                        }
                    }
                }
            }

            // Unlocked Section
            if !rewardsManager.unlockedAchievements.isEmpty {
                VStack(alignment: .leading, spacing: 12) {
                    Text("Unlocked")
                        .font(.system(size: 20, weight: .bold))
                        .foregroundColor(colorScheme == .dark ? .white : .black)
                        .padding(.horizontal)

                    GlassEffectContainer(spacing: 16) {
                        LazyVGrid(columns: columns, spacing: 12) {
                            ForEach(rewardsManager.unlockedAchievements) { achievement in
                                AchievementCard(achievement: achievement)
                            }
                        }
                    }
                }
            }
        }
    }
}

// MARK: - Achievement Card

struct AchievementCard: View {
    let achievement: Achievement
    @Environment(\.colorScheme) var colorScheme

    private var iconBackgroundGradient: LinearGradient {
        if achievement.isUnlocked {
            return LinearGradient(
                colors: [Color.yellow.opacity(0.3), Color.orange.opacity(0.3)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        } else {
            let colors = colorScheme == .dark
                ? [Color.white.opacity(0.1), Color.white.opacity(0.05)]
                : [Color.black.opacity(0.05), Color.black.opacity(0.03)]
            return LinearGradient(
                colors: colors,
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        }
    }

    private var cardBackgroundColor: Color {
        if achievement.isUnlocked {
            return colorScheme == .dark ? Color.white.opacity(0.08) : Color.black.opacity(0.05)
        } else {
            return colorScheme == .dark ? Color.white.opacity(0.03) : Color.black.opacity(0.02)
        }
    }

    private var borderColor: Color {
        if achievement.isUnlocked {
            return Color.yellow.opacity(0.03)
        } else {
            return .clear
        }
    }

    var body: some View {
        VStack(spacing: 12) {
            // Icon with Background
            ZStack {
                Circle()
                    .fill(iconBackgroundGradient)
                    .frame(width: 60, height: 60)

                Image(systemName: achievement.icon)
                    .font(.system(size: 28))
                    .foregroundColor(achievement.isUnlocked ? .yellow : (colorScheme == .dark ? .white.opacity(0.3) : .black.opacity(0.3)))

                // Lock overlay for locked achievements
                if !achievement.isUnlocked {
                    Image(systemName: "lock.fill")
                        .font(.system(size: 16))
                        .foregroundColor(colorScheme == .dark ? .white.opacity(0.6) : .black.opacity(0.4))
                        .offset(x: 20, y: 20)
                }
            }

            VStack(spacing: 4) {
                Text(achievement.name)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(colorScheme == .dark ? .white : .black)
                    .lineLimit(2)
                    .multilineTextAlignment(.center)

                Text(achievement.description)
                    .font(.system(size: 11))
                    .foregroundColor(colorScheme == .dark ? .white.opacity(0.6) : .black.opacity(0.5))
                    .lineLimit(2)
                    .multilineTextAlignment(.center)
            }

            // Progress or Points
            if achievement.isUnlocked {
                HStack(spacing: 4) {
                    Image(systemName: "star.fill")
                        .font(.system(size: 10))
                        .foregroundColor(.yellow)

                    Text("+\(achievement.points) pts")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(colorScheme == .dark ? .white : .black)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(
                    Capsule()
                        .fill(Color.yellow.opacity(0.15))
                )
            } else {
                VStack(spacing: 6) {
                    Text(achievement.progressText)
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(colorScheme == .dark ? .white.opacity(0.7) : .black.opacity(0.6))

                    GeometryReader { geometry in
                        ZStack(alignment: .leading) {
                            RoundedRectangle(cornerRadius: 2)
                                .fill(colorScheme == .dark ? Color.white.opacity(0.2) : Color.black.opacity(0.1))
                                .frame(height: 4)

                            RoundedRectangle(cornerRadius: 2)
                                .fill(Color.purple)
                                .frame(width: geometry.size.width * achievement.progressPercentage, height: 4)
                        }
                    }
                    .frame(height: 4)
                }
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(borderColor, lineWidth: achievement.isUnlocked ? 2 : 0)
        )
        .glassEffect(in: RoundedRectangle(cornerRadius: 16))
    }
}

// MARK: - Achievement Notification

struct AchievementNotificationView: View {
    let achievement: Achievement
    let onDismiss: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 16) {
                // Icon
                ZStack {
                    Circle()
                        .fill(
                            RadialGradient(
                                colors: [Color.yellow.opacity(0.4), Color.yellow.opacity(0)],
                                center: .center,
                                startRadius: 15,
                                endRadius: 30
                            )
                        )
                        .frame(width: 60, height: 60)

                    Image(systemName: achievement.icon)
                        .font(.system(size: 28))
                        .foregroundColor(.yellow)
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text("Achievement Unlocked!")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.yellow)

                    Text(achievement.name)
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(.white)

                    HStack(spacing: 4) {
                        Image(systemName: "star.fill")
                            .font(.system(size: 10))
                        Text("+\(achievement.points) points")
                            .font(.system(size: 12, weight: .semibold))
                    }
                    .foregroundColor(.yellow)
                }

                Spacer()

                Button(action: onDismiss) {
                    Image(systemName: "xmark")
                        .font(.system(size: 14))
                        .foregroundColor(.white.opacity(0.6))
                }
            }
            .padding(20)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(
                        LinearGradient(
                            colors: [Color(red: 0.43, green: 0.37, blue: 0.99), Color(red: 0.62, green: 0.47, blue: 1)],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .shadow(color: Color.purple.opacity(0.5), radius: 20, y: 10)
            )
            .padding(.horizontal)
            .padding(.top, 60) // Account for status bar

            Spacer()
        }
        .onAppear {
            DispatchQueue.main.asyncAfter(deadline: .now() + 4) {
                onDismiss()
            }
        }
    }
}

// MARK: - Store Coming Soon

struct StoreComingSoon: View {
    @Environment(\.colorScheme) var colorScheme

    var body: some View {
        VStack(spacing: 12) {
            Spacer()
                .frame(height: 120)

            Image(systemName: "cart.fill")
                .font(.system(size: 48))
                .foregroundColor(colorScheme == .dark ? .white.opacity(0.3) : .black.opacity(0.25))

            Text("Store coming soon")
                .font(.system(size: 18, weight: .medium))
                .foregroundColor(colorScheme == .dark ? .white.opacity(0.6) : .black.opacity(0.5))

            Text("Redeem your points for exclusive rewards")
                .font(.system(size: 14))
                .foregroundColor(colorScheme == .dark ? .white.opacity(0.4) : .black.opacity(0.35))
                .multilineTextAlignment(.center)

            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

#Preview {
    RewardsPopupView()
        .environmentObject(RewardsManager.shared)
        .background(Color.black)
}
