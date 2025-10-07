//
//  Achievement.swift
//  RAGScholar
//
//  Models for achievements and user stats
//

import Foundation

struct Achievement: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let description: String
    let icon: String
    let points: Int
    let target: Int
    var progress: Int
    var isUnlocked: Bool
    let unlockedAt: Date?

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case description
        case icon
        case points
        case target
        case progress
        case isUnlocked = "is_unlocked"
        case unlockedAt = "unlocked_at"
    }

    var progressPercentage: Double {
        guard target > 0 else { return 0 }
        return Double(progress) / Double(target)
    }

    var progressText: String {
        return "\(progress) / \(target)"
    }
}

struct UserStats: Codable {
    let totalPoints: Int
    let achievementsUnlocked: Int
    let totalAchievements: Int
    let chatsCreated: Int
    let documentsUploaded: Int
    let questionsAsked: Int

    enum CodingKeys: String, CodingKey {
        case totalPoints = "total_points"
        case achievementsUnlocked = "achievements_unlocked"
        case totalAchievements = "total_achievements"
        case chatsCreated = "chats_created"
        case documentsUploaded = "documents_uploaded"
        case questionsAsked = "questions_asked"
    }

    var nextMilestonePoints: Int {
        let milestones = [100, 250, 500, 1000, 2500, 5000, 10000]
        return milestones.first(where: { $0 > totalPoints }) ?? (totalPoints + 1000)
    }

    var progressToNextMilestone: Double {
        let milestones = [0, 100, 250, 500, 1000, 2500, 5000, 10000]
        guard let currentMilestoneIndex = milestones.lastIndex(where: { $0 <= totalPoints }),
              currentMilestoneIndex < milestones.count - 1 else {
            return 1.0
        }

        let currentMilestone = milestones[currentMilestoneIndex]
        let nextMilestone = milestones[currentMilestoneIndex + 1]
        let progress = totalPoints - currentMilestone
        let range = nextMilestone - currentMilestone

        return Double(progress) / Double(range)
    }
}

// Default achievements for the app
extension Achievement {
    static let defaultAchievements: [Achievement] = [
        Achievement(
            id: "first_chat",
            name: "First Steps",
            description: "Start your first chat",
            icon: "message.fill",
            points: 10,
            target: 1,
            progress: 0,
            isUnlocked: false,
            unlockedAt: nil
        ),
        Achievement(
            id: "upload_document",
            name: "Knowledge Seeker",
            description: "Upload your first document",
            icon: "doc.badge.plus",
            points: 15,
            target: 1,
            progress: 0,
            isUnlocked: false,
            unlockedAt: nil
        ),
        Achievement(
            id: "create_class",
            name: "Organization Master",
            description: "Create your first class",
            icon: "folder.badge.plus",
            points: 20,
            target: 1,
            progress: 0,
            isUnlocked: false,
            unlockedAt: nil
        ),
        Achievement(
            id: "ten_chats",
            name: "Conversationalist",
            description: "Complete 10 chat sessions",
            icon: "bubble.left.and.bubble.right.fill",
            points: 50,
            target: 10,
            progress: 0,
            isUnlocked: false,
            unlockedAt: nil
        ),
        Achievement(
            id: "five_documents",
            name: "Librarian",
            description: "Upload 5 documents",
            icon: "books.vertical.fill",
            points: 50,
            target: 5,
            progress: 0,
            isUnlocked: false,
            unlockedAt: nil
        ),
        Achievement(
            id: "hundred_questions",
            name: "Curious Mind",
            description: "Ask 100 questions",
            icon: "questionmark.bubble.fill",
            points: 100,
            target: 100,
            progress: 0,
            isUnlocked: false,
            unlockedAt: nil
        ),
        Achievement(
            id: "three_classes",
            name: "Multi-tasker",
            description: "Create 3 different classes",
            icon: "square.grid.3x3.fill",
            points: 75,
            target: 3,
            progress: 0,
            isUnlocked: false,
            unlockedAt: nil
        ),
        Achievement(
            id: "early_bird",
            name: "Early Bird",
            description: "Use the app before 6 AM",
            icon: "sunrise.fill",
            points: 25,
            target: 1,
            progress: 0,
            isUnlocked: false,
            unlockedAt: nil
        ),
        Achievement(
            id: "night_owl",
            name: "Night Owl",
            description: "Use the app after 11 PM",
            icon: "moon.stars.fill",
            points: 25,
            target: 1,
            progress: 0,
            isUnlocked: false,
            unlockedAt: nil
        ),
        Achievement(
            id: "week_streak",
            name: "Dedicated Learner",
            description: "Use the app 7 days in a row",
            icon: "flame.fill",
            points: 150,
            target: 7,
            progress: 0,
            isUnlocked: false,
            unlockedAt: nil
        )
    ]
}
