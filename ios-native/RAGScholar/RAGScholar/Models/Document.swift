//
//  Document.swift
//  RAGScholar
//
//  Model for uploaded documents
//

import Foundation

struct Document: Codable, Identifiable, Hashable {
    let id: String
    var filename: String
    let fileType: String?
    let chunks: Int?
    let uploadDate: String?
    var assignedClasses: [String]?
    let collection: String?

    enum CodingKeys: String, CodingKey {
        case id
        case filename
        case fileType = "file_type"
        case chunks
        case uploadDate = "upload_date"
        case assignedClasses = "assigned_classes"
        case collection
    }
}
