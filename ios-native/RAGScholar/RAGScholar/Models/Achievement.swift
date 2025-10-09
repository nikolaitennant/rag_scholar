//
//  Achievement.swift
//  RAGScholar
//
//  Models for achievements and user stats
//

import Foundation

struct Achievement: Codable, Identifiable, Hashable {
    let type: String
    let name: String
    let description: String
    let points: Int
    let target: Int
    var progress: Int
    var unlockedAt: String?

    var id: String { type }
    var icon: String { getIcon(for: type) }
    var isUnlocked: Bool { unlockedAt != nil }

    enum CodingKeys: String, CodingKey {
        case type
        case name
        case description
        case points
        case target
        case progress
        case unlockedAt = "unlocked_at"
    }

    var progressPercentage: Double {
        guard target > 0 else { return 0 }
        return Double(progress) / Double(target)
    }

    var progressText: String {
        return "\(progress) / \(target)"
    }

    private func getIcon(for type: String) -> String {
        switch type {
        case "first_chat": return "message.fill"
        case "upload_document": return "doc.badge.plus"
        case "create_class": return "folder.badge.plus"
        case "ten_chats": return "bubble.left.and.bubble.right.fill"
        case "five_documents": return "books.vertical.fill"
        case "hundred_questions": return "brain.head.profile"
        case "three_classes": return "square.stack.3d.up.fill"
        case "early_bird": return "sunrise.fill"
        case "night_owl": return "moon.stars.fill"
        case "week_streak": return "flame.fill"
        case "knowledge_seeker": return "questionmark.bubble.fill"
        case "citation_master": return "quote.bubble.fill"
        case "domain_explorer": return "map.fill"
        case "research_streak": return "flame.fill"
        case "power_user": return "star.fill"
        case "early_adopter": return "crown.fill"
        default: return "trophy.fill"
        }
    }
}

struct UserStats: Codable {
    let totalPoints: Int
    let achievementsUnlocked: Int
    let totalAchievements: Int
    let chatsCreated: Int
    let documentsUploaded: Int
    let questionsAsked: Int
    let totalPossiblePoints: Int?

    enum CodingKeys: String, CodingKey {
        case totalPoints = "total_points"
        case achievementsUnlocked = "achievements_unlocked"
        case totalAchievements = "total_achievements"
        case chatsCreated = "chats_created"
        case documentsUploaded = "documents_uploaded"
        case questionsAsked = "questions_asked"
        case totalPossiblePoints = "total_possible_points"
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

    var progressToTotalPoints: Double {
        guard let maxPoints = totalPossiblePoints, maxPoints > 0 else {
            return progressToNextMilestone
        }
        return Double(totalPoints) / Double(maxPoints)
    }
}

// Default achievements for the app
extension Achievement {
    static let defaultAchievements: [Achievement] = [
        Achievement(
            type: "first_chat",
            name: "First Steps",
            description: "Start your first chat",
            points: 10,
            target: 1,
            progress: 0,
            unlockedAt: nil
        ),
        Achievement(
            type: "upload_document",
            name: "Knowledge Seeker",
            description: "Upload your first document",
            points: 15,
            target: 1,
            progress: 0,
            unlockedAt: nil
        ),
        Achievement(
            type: "create_class",
            name: "Organization Master",
            description: "Create your first class",
            points: 20,
            target: 1,
            progress: 0,
            unlockedAt: nil
        ),
        Achievement(
            type: "ten_chats",
            name: "Conversationalist",
            description: "Complete 10 chat sessions",
            points: 50,
            target: 10,
            progress: 0,
            unlockedAt: nil
        ),
        Achievement(
            type: "five_documents",
            name: "Librarian",
            description: "Upload 5 documents",
            points: 50,
            target: 5,
            progress: 0,
            unlockedAt: nil
        ),
        Achievement(
            type: "hundred_questions",
            name: "Curious Mind",
            description: "Ask 100 questions",
            points: 100,
            target: 100,
            progress: 0,
            unlockedAt: nil
        ),
        Achievement(
            type: "three_classes",
            name: "Multi-tasker",
            description: "Create 3 different classes",
            points: 75,
            target: 3,
            progress: 0,
            unlockedAt: nil
        ),
        Achievement(
            type: "early_bird",
            name: "Early Bird",
            description: "Use the app before 6 AM",
            points: 25,
            target: 1,
            progress: 0,
            unlockedAt: nil
        ),
        Achievement(
            type: "night_owl",
            name: "Night Owl",
            description: "Use the app after 11 PM",
            points: 25,
            target: 1,
            progress: 0,
            unlockedAt: nil
        ),
        Achievement(
            type: "week_streak",
            name: "Dedicated Learner",
            description: "Use the app 7 days in a row",
            points: 150,
            target: 7,
            progress: 0,
            unlockedAt: nil
        )
    ]
}
