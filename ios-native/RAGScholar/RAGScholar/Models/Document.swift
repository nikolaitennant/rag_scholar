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
    let fileType: String
    let chunks: Int
    let uploadDate: Date?
    var assignedClasses: [String]
    let size: Int?
    let status: String?

    enum CodingKeys: String, CodingKey {
        case id
        case filename
        case fileType = "file_type"
        case chunks
        case uploadDate = "upload_date"
        case assignedClasses = "assigned_classes"
        case size
        case status
    }
}
