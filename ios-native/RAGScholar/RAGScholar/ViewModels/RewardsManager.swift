//
//  RewardsManager.swift
//  RAGScholar
//
//  Manages achievements and user statistics
//

import Foundation
import Combine

@MainActor
class RewardsManager: ObservableObject {
    static let shared = RewardsManager()

    @Published var achievements: [Achievement] = Achievement.defaultAchievements
    @Published var userStats: UserStats?
    @Published var isLoading = false
    @Published var error: String?
    @Published var showAchievementNotification: Achievement?

    private let apiService = APIService.shared

    private init() {
        // Load from local storage as fallback
        loadFromStorage()
    }

    // MARK: - Data Fetching

    func fetchAchievements() async {
        isLoading = true
        error = nil

        do {
            // TODO: Implement API endpoint for achievements
            // achievements = try await apiService.fetchAchievements()

            // For now, use default achievements and update progress
            await updateAchievementProgress()

            saveToStorage()
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    func fetchUserStats() async {
        do {
            // TODO: Implement API endpoint for user stats
            // userStats = try await apiService.fetchUserStats()

            // Mock data for now
            userStats = UserStats(
                totalPoints: 125,
                achievementsUnlocked: 3,
                totalAchievements: achievements.count,
                chatsCreated: 5,
                documentsUploaded: 2,
                questionsAsked: 15
            )

            saveToStorage()
        } catch {
            self.error = error.localizedDescription
        }
    }

    // MARK: - Achievement Tracking

    private func updateAchievementProgress() async {
        // Update progress based on user activity
        // This would be called after various actions in the app

        let chatManager = ChatManager.shared
        let documentManager = DocumentManager.shared
        let classManager = ClassManager.shared

        // First chat
        if let index = achievements.firstIndex(where: { $0.id == "first_chat" }) {
            achievements[index].progress = min(chatManager.sessions.count, 1)
            checkAndUnlock(achievementId: "first_chat")
        }

        // Ten chats
        if let index = achievements.firstIndex(where: { $0.id == "ten_chats" }) {
            achievements[index].progress = min(chatManager.sessions.count, 10)
            checkAndUnlock(achievementId: "ten_chats")
        }

        // Upload document
        if let index = achievements.firstIndex(where: { $0.id == "upload_document" }) {
            achievements[index].progress = min(documentManager.documents.count, 1)
            checkAndUnlock(achievementId: "upload_document")
        }

        // Five documents
        if let index = achievements.firstIndex(where: { $0.id == "five_documents" }) {
            achievements[index].progress = min(documentManager.documents.count, 5)
            checkAndUnlock(achievementId: "five_documents")
        }

        // Create class
        if let index = achievements.firstIndex(where: { $0.id == "create_class" }) {
            achievements[index].progress = min(classManager.classes.count, 1)
            checkAndUnlock(achievementId: "create_class")
        }

        // Three classes
        if let index = achievements.firstIndex(where: { $0.id == "three_classes" }) {
            achievements[index].progress = min(classManager.classes.count, 3)
            checkAndUnlock(achievementId: "three_classes")
        }

        // Time-based achievements
        checkTimeBasedAchievements()
    }

    private func checkTimeBasedAchievements() {
        let hour = Calendar.current.component(.hour, from: Date())

        // Early bird (before 6 AM)
        if hour < 6 {
            if let index = achievements.firstIndex(where: { $0.id == "early_bird" }) {
                achievements[index].progress = 1
                checkAndUnlock(achievementId: "early_bird")
            }
        }

        // Night owl (after 11 PM)
        if hour >= 23 {
            if let index = achievements.firstIndex(where: { $0.id == "night_owl" }) {
                achievements[index].progress = 1
                checkAndUnlock(achievementId: "night_owl")
            }
        }
    }

    private func checkAndUnlock(achievementId: String) {
        guard let index = achievements.firstIndex(where: { $0.id == achievementId }) else {
            return
        }

        let achievement = achievements[index]

        // Check if achievement should be unlocked
        if !achievement.isUnlocked && achievement.progress >= achievement.target {
            achievements[index].isUnlocked = true
            achievements[index].unlockedAt = Date()

            // Add points to user stats
            if var stats = userStats {
                stats = UserStats(
                    totalPoints: stats.totalPoints + achievement.points,
                    achievementsUnlocked: stats.achievementsUnlocked + 1,
                    totalAchievements: stats.totalAchievements,
                    chatsCreated: stats.chatsCreated,
                    documentsUploaded: stats.documentsUploaded,
                    questionsAsked: stats.questionsAsked
                )
                userStats = stats
            }

            // Show notification
            showAchievementNotification = achievements[index]

            // Haptic feedback
            HapticManager.shared.success()

            // Save to storage
            saveToStorage()
        }
    }

    func dismissAchievementNotification() {
        showAchievementNotification = nil
    }

    // MARK: - Public Methods to Track Actions

    func trackChatCreated() async {
        if var stats = userStats {
            stats = UserStats(
                totalPoints: stats.totalPoints,
                achievementsUnlocked: stats.achievementsUnlocked,
                totalAchievements: stats.totalAchievements,
                chatsCreated: stats.chatsCreated + 1,
                documentsUploaded: stats.documentsUploaded,
                questionsAsked: stats.questionsAsked
            )
            userStats = stats
        }
        await updateAchievementProgress()
    }

    func trackDocumentUploaded() async {
        if var stats = userStats {
            stats = UserStats(
                totalPoints: stats.totalPoints,
                achievementsUnlocked: stats.achievementsUnlocked,
                totalAchievements: stats.totalAchievements,
                chatsCreated: stats.chatsCreated,
                documentsUploaded: stats.documentsUploaded + 1,
                questionsAsked: stats.questionsAsked
            )
            userStats = stats
        }
        await updateAchievementProgress()
    }

    func trackQuestionAsked() async {
        if var stats = userStats {
            stats = UserStats(
                totalPoints: stats.totalPoints,
                achievementsUnlocked: stats.achievementsUnlocked,
                totalAchievements: stats.totalAchievements,
                chatsCreated: stats.chatsCreated,
                documentsUploaded: stats.documentsUploaded,
                questionsAsked: stats.questionsAsked + 1
            )
            userStats = stats
        }
        await updateAchievementProgress()
    }

    // MARK: - Persistence

    private func saveToStorage() {
        if let encoded = try? JSONEncoder().encode(achievements) {
            UserDefaults.standard.set(encoded, forKey: "achievements")
        }
        if let stats = userStats, let encoded = try? JSONEncoder().encode(stats) {
            UserDefaults.standard.set(encoded, forKey: "userStats")
        }
    }

    private func loadFromStorage() {
        if let data = UserDefaults.standard.data(forKey: "achievements"),
           let decoded = try? JSONDecoder().decode([Achievement].self, from: data) {
            achievements = decoded
        }
        if let data = UserDefaults.standard.data(forKey: "userStats"),
           let decoded = try? JSONDecoder().decode(UserStats.self, from: data) {
            userStats = decoded
        }
    }

    // MARK: - Helper Methods

    var unlockedAchievements: [Achievement] {
        achievements.filter { $0.isUnlocked }.sorted { ($0.unlockedAt ?? Date.distantPast) > ($1.unlockedAt ?? Date.distantPast) }
    }

    var lockedAchievements: [Achievement] {
        achievements.filter { !$0.isUnlocked }.sorted { $0.points < $1.points }
    }
}
