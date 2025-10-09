//
//  RewardsManager.swift
//  RAGScholar
//
//  Manages achievements and user statistics
//

import Foundation
import Combine
import UserNotifications

@MainActor
class RewardsManager: ObservableObject {
    static let shared = RewardsManager()

    @Published var achievements: [Achievement] = Achievement.defaultAchievements
    @Published var userStats: UserStats?
    @Published var isLoading = false
    @Published var error: String?

    private let apiService = APIService.shared

    private init() {
        // Load from local storage as fallback
        loadFromStorage()
        // Request notification permissions
        requestNotificationPermissions()
    }

    private func requestNotificationPermissions() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
            if granted {
                print("✅ Notification permissions granted")
            } else if let error = error {
                print("❌ Notification permission error: \(error)")
            }
        }
    }

    // MARK: - Data Fetching

    func fetchAchievements() async {
        isLoading = true
        error = nil

        do {
            // Fetch user profile which includes achievements
            _ = try await apiService.refreshAchievements()

            // Parse achievements from user profile
            // For now, just update progress on default achievements
            await updateAchievementProgress()

            saveToStorage()
        } catch {
            self.error = error.localizedDescription
            // Fallback to local progress update
            await updateAchievementProgress()
        }

        isLoading = false
    }

    func fetchUserStats() async {
        do {
            // Fetch user profile which includes stats
            let userProfile = try await apiService.getCurrentUser()

            // Calculate total possible points from all achievements
            let totalPossiblePoints = achievements.reduce(0) { $0 + $1.points }

            // Count unlocked achievements and calculate actual points earned
            let unlockedAchievements = userProfile.achievements?.filter { $0.isUnlocked } ?? []
            let achievementsUnlocked = unlockedAchievements.count

            // Calculate total points from unlocked achievements
            let calculatedPoints = unlockedAchievements.reduce(0) { $0 + $1.points }

            // Parse stats from user profile
            if let stats = userProfile.stats {
                // Use calculated points if it's higher than stored points (for data integrity)
                let totalPoints = max(stats.totalPoints ?? 0, calculatedPoints)

                userStats = UserStats(
                    totalPoints: totalPoints,
                    achievementsUnlocked: achievementsUnlocked,
                    totalAchievements: achievements.count,
                    chatsCreated: stats.totalChats ?? 0,
                    documentsUploaded: stats.documentsUploaded ?? 0,
                    questionsAsked: 0, // Not in backend response
                    totalPossiblePoints: totalPossiblePoints
                )

                print("📊 User Stats - Points: \(totalPoints) (calculated: \(calculatedPoints), stored: \(stats.totalPoints ?? 0)), Unlocked: \(achievementsUnlocked)/\(achievements.count)")
            } else {
                // Mock data fallback
                userStats = UserStats(
                    totalPoints: 125,
                    achievementsUnlocked: achievementsUnlocked,
                    totalAchievements: achievements.count,
                    chatsCreated: 5,
                    documentsUploaded: 2,
                    questionsAsked: 15,
                    totalPossiblePoints: totalPossiblePoints
                )
            }

            saveToStorage()
        } catch {
            self.error = error.localizedDescription
            // Mock data fallback
            let totalPossiblePoints = achievements.reduce(0) { $0 + $1.points }
            userStats = UserStats(
                totalPoints: 125,
                achievementsUnlocked: 3,
                totalAchievements: achievements.count,
                chatsCreated: 5,
                documentsUploaded: 2,
                questionsAsked: 15,
                totalPossiblePoints: totalPossiblePoints
            )
        }
    }

    func grantEarlyAdopter() async {
        do {
            try await apiService.grantEarlyAdopter()
            await fetchUserStats()
            await fetchAchievements()
            HapticManager.shared.success()
        } catch {
            self.error = error.localizedDescription
            HapticManager.shared.error()
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
            let isoFormatter = ISO8601DateFormatter()
            achievements[index].unlockedAt = isoFormatter.string(from: Date())

            // Add points to user stats
            if var stats = userStats {
                stats = UserStats(
                    totalPoints: stats.totalPoints + achievement.points,
                    achievementsUnlocked: stats.achievementsUnlocked + 1,
                    totalAchievements: stats.totalAchievements,
                    chatsCreated: stats.chatsCreated,
                    documentsUploaded: stats.documentsUploaded,
                    questionsAsked: stats.questionsAsked,
                    totalPossiblePoints: stats.totalPossiblePoints
                )
                userStats = stats
            }

            // Send iOS notification
            Task {
                await showAchievementNotification(achievements[index])
            }

            // Haptic feedback
            HapticManager.shared.success()

            // Save to storage
            saveToStorage()
        }
    }

    func showAchievementNotification(_ achievement: Achievement) async {
        let content = UNMutableNotificationContent()
        content.title = "🎉 Achievement Unlocked!"
        content.body = "\(achievement.name) - +\(achievement.points) points"
        content.sound = .default

        // Create the request
        let request = UNNotificationRequest(
            identifier: UUID().uuidString,
            content: content,
            trigger: nil // Deliver immediately
        )

        // Schedule the notification
        do {
            try await UNUserNotificationCenter.current().add(request)
            print("✅ Notification sent for achievement: \(achievement.name)")
        } catch {
            print("❌ Error sending notification: \(error)")
        }
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
                questionsAsked: stats.questionsAsked,
                totalPossiblePoints: stats.totalPossiblePoints
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
                questionsAsked: stats.questionsAsked,
                totalPossiblePoints: stats.totalPossiblePoints
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
                questionsAsked: stats.questionsAsked + 1,
                totalPossiblePoints: stats.totalPossiblePoints
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

    func clearCache() {
        UserDefaults.standard.removeObject(forKey: "achievements")
        UserDefaults.standard.removeObject(forKey: "userStats")
        achievements = Achievement.defaultAchievements
        userStats = nil
    }

    // MARK: - Helper Methods

    var unlockedAchievements: [Achievement] {
        let isoFormatter = ISO8601DateFormatter()
        return achievements.filter { $0.isUnlocked }.sorted {
            let date1 = $0.unlockedAt.flatMap { isoFormatter.date(from: $0) } ?? Date.distantPast
            let date2 = $1.unlockedAt.flatMap { isoFormatter.date(from: $0) } ?? Date.distantPast
            return date1 > date2
        }
    }

    var lockedAchievements: [Achievement] {
        achievements.filter { !$0.isUnlocked }.sorted { $0.points < $1.points }
    }
}
