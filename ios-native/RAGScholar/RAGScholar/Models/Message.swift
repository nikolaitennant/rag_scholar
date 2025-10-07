//
//  Message.swift
//  RAGScholar
//
//  Model for chat messages
//

import Foundation

struct Message: Codable, Identifiable, Hashable {
    let id: UUID
    let role: MessageRole
    let content: String
    let timestamp: Date
    let citations: [Citation]?

    enum MessageRole: String, Codable {
        case user
        case assistant
    }

    init(id: UUID = UUID(), role: MessageRole, content: String, timestamp: Date = Date(), citations: [Citation]? = nil) {
        self.id = id
        self.role = role
        self.content = content
        self.timestamp = timestamp
        self.citations = citations
    }
}

struct Citation: Codable, Identifiable, Hashable {
    let id: String
    let source: String
    let page: Int?
    let preview: String
    let relevanceScore: Double

    enum CodingKeys: String, CodingKey {
        case id
        case source
        case page
        case preview
        case relevanceScore = "relevance_score"
    }
}

struct ChatSession: Codable, Identifiable, Hashable {
    let id: String
    var name: String
    let messageCount: Int
    let updatedAt: Date
    let classId: String?

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case messageCount = "message_count"
        case updatedAt = "updated_at"
        case classId = "class_id"
    }
}
