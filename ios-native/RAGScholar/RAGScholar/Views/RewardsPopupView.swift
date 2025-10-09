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

#Preview {
    RewardsPopupView()
        .environmentObject(RewardsManager.shared)
        .background(Color.black)
}
