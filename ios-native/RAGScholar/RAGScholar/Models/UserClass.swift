//
//  UserClass.swift
//  RAGScholar
//
//  Model for user-created classes
//

import Foundation

struct UserClass: Codable, Identifiable, Hashable {
    let id: String
    var name: String
    var domainType: DomainType
    var description: String?
    var documents: [String]
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case domainType = "domain_type"
        case description
        case documents
        case createdAt = "created_at"
    }
}

enum DomainType: String, Codable, CaseIterable {
    case general
    case law
    case science
    case medicine
    case business
    case history
    case computerScience = "computer_science"
    case engineering
    case literature

    var displayName: String {
        switch self {
        case .general: return "General"
        case .law: return "Law"
        case .science: return "Science"
        case .medicine: return "Medicine"
        case .business: return "Business"
        case .history: return "History"
        case .computerScience: return "Computer Science"
        case .engineering: return "Engineering"
        case .literature: return "Literature"
        }
    }

    var shortName: String {
        switch self {
        case .general: return "General"
        case .law: return "Law"
        case .science: return "Science"
        case .medicine: return "Medicine"
        case .business: return "Business"
        case .history: return "History"
        case .computerScience: return "CS"
        case .engineering: return "Eng"
        case .literature: return "Lit"
        }
    }

    var icon: String {
        switch self {
        case .general: return "house.fill"
        case .law: return "book.fill"
        case .science: return "flask.fill"
        case .medicine: return "heart.fill"
        case .business: return "briefcase.fill"
        case .history: return "clock.fill"
        case .computerScience: return "chevron.left.forwardslash.chevron.right"
        case .engineering: return "gearshape.fill"
        case .literature: return "pencil.and.outline"
        }
    }

    var color: String {
        switch self {
        case .general: return "blue"
        case .law: return "orange"
        case .science: return "green"
        case .medicine: return "red"
        case .business: return "purple"
        case .history: return "pink"
        case .computerScience: return "cyan"
        case .engineering: return "orange"
        case .literature: return "indigo"
        }
    }
}
