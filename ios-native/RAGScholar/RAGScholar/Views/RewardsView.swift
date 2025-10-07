//
//  RewardsView.swift
//  RAGScholar
//
//  Rewards and achievements display
//

import SwiftUI

struct RewardsView: View {
    @EnvironmentObject var rewardsManager: RewardsManager

    @State private var selectedTab = 0

    var body: some View {
        VStack(spacing: 0) {
            // Header with Points
            if let stats = rewardsManager.userStats {
                PointsHeader(stats: stats)
                    .padding()
            }

            // Segmented Control
            Picker("View", selection: $selectedTab) {
                Text("Achievements").tag(0)
                Text("Store").tag(1)
            }
            .pickerStyle(SegmentedPickerStyle())
            .padding(.horizontal)

            // Content
            ScrollView {
                if selectedTab == 0 {
                    AchievementsGrid()
                        .padding()
                } else {
                    StoreComingSoon()
                        .padding()
                }
            }
            .padding(.bottom, 100)
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

// MARK: - Points Header

struct PointsHeader: View {
    let stats: UserStats

    var body: some View {
        HStack(spacing: 20) {
            // Star Icon with Glow
            ZStack {
                Circle()
                    .fill(
                        RadialGradient(
                            colors: [Color.yellow.opacity(0.4), Color.yellow.opacity(0)],
                            center: .center,
                            startRadius: 20,
                            endRadius: 40
                        )
                    )
                    .frame(width: 80, height: 80)

                Image(systemName: "star.fill")
                    .font(.system(size: 40))
                    .foregroundColor(.yellow)
                    .symbolEffect(.pulse)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text("\(stats.totalPoints)")
                    .font(.system(size: 42, weight: .bold))
                    .foregroundColor(.white)

                Text("Total Points")
                    .font(.system(size: 16))
                    .foregroundColor(.white.opacity(0.7))

                Text("\(stats.achievementsUnlocked) of \(stats.totalAchievements) unlocked")
                    .font(.system(size: 14))
                    .foregroundColor(.white.opacity(0.5))
            }

            Spacer()
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
        )
    }
}

// MARK: - Achievements Grid

struct AchievementsGrid: View {
    @EnvironmentObject var rewardsManager: RewardsManager

    let columns = [
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12)
    ]

    var body: some View {
        LazyVGrid(columns: columns, spacing: 12) {
            // Unlocked achievements first
            ForEach(rewardsManager.unlockedAchievements) { achievement in
                AchievementCard(achievement: achievement)
            }

            // Then locked achievements
            ForEach(rewardsManager.lockedAchievements) { achievement in
                AchievementCard(achievement: achievement)
            }
        }
    }
}

// MARK: - Achievement Card

struct AchievementCard: View {
    let achievement: Achievement

    var body: some View {
        VStack(spacing: 12) {
            // Icon with Background
            ZStack {
                Circle()
                    .fill(achievement.isUnlocked
                          ? LinearGradient(
                            colors: [Color.yellow.opacity(0.3), Color.orange.opacity(0.3)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                          )
                          : LinearGradient(
                            colors: [Color.white.opacity(0.1), Color.white.opacity(0.05)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                          )
                    )
                    .frame(width: 60, height: 60)

                Image(systemName: achievement.icon)
                    .font(.system(size: 28))
                    .foregroundColor(achievement.isUnlocked ? .yellow : .white.opacity(0.3))

                // Lock overlay for locked achievements
                if !achievement.isUnlocked {
                    Image(systemName: "lock.fill")
                        .font(.system(size: 16))
                        .foregroundColor(.white.opacity(0.6))
                        .offset(x: 20, y: 20)
                }
            }

            VStack(spacing: 4) {
                Text(achievement.name)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.white)
                    .lineLimit(2)
                    .multilineTextAlignment(.center)

                Text(achievement.description)
                    .font(.system(size: 11))
                    .foregroundColor(.white.opacity(0.6))
                    .lineLimit(2)
                    .multilineTextAlignment(.center)
            }

            // Progress or Points
            if achievement.isUnlocked {
                HStack(spacing: 4) {
                    Image(systemName: "star.fill")
                        .font(.system(size: 10))
                        .foregroundColor(.yellow)

                    Text("\(achievement.points) pts")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.white)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(
                    Capsule()
                        .fill(Color.green.opacity(0.3))
                )
            } else {
                VStack(spacing: 6) {
                    Text(achievement.progressText)
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(.white.opacity(0.7))

                    GeometryReader { geometry in
                        ZStack(alignment: .leading) {
                            RoundedRectangle(cornerRadius: 2)
                                .fill(Color.white.opacity(0.2))
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
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(achievement.isUnlocked
                      ? Color.white.opacity(0.08)
                      : Color.white.opacity(0.03)
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(achievement.isUnlocked ? Color.yellow.opacity(0.3) : Color.white.opacity(0.05), lineWidth: 1)
                )
        )
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
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "cart.fill")
                .font(.system(size: 64))
                .foregroundColor(.white.opacity(0.3))

            VStack(spacing: 8) {
                Text("Store Coming Soon")
                    .font(.system(size: 24, weight: .bold))
                    .foregroundColor(.white)

                Text("Redeem your points for exclusive rewards")
                    .font(.system(size: 16))
                    .foregroundColor(.white.opacity(0.6))
                    .multilineTextAlignment(.center)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

#Preview {
    RewardsView()
        .environmentObject(RewardsManager.shared)
        .background(Color.black)
}
