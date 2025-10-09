//
//  Message.swift
//  RAGScholar
//
//  Model for chat messages
//

import Foundation

struct Message: Codable, Identifiable, Hashable {
    var id: UUID { UUID() }
    let role: MessageRole
    let content: String
    let timestamp: String?
    let citations: [Citation]?

    enum MessageRole: String, Codable {
        case user
        case assistant
    }

    enum CodingKeys: String, CodingKey {
        case role
        case content
        case timestamp
        case citations
    }

    init(role: MessageRole, content: String, timestamp: String? = nil, citations: [Citation]? = nil) {
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
    let messageCount: Int?
    let createdAt: String?
    let updatedAt: String?
    let classId: String?
    let preview: String?
    let className: String?
    let domain: String?

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case messageCount = "message_count"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case classId = "class_id"
        case preview
        case className = "class_name"
        case domain
    }
}
