//
//  DocumentManager.swift
//  RAGScholar
//
//  Manages document uploads and assignments
//

import Foundation
import Combine
import UniformTypeIdentifiers
internal import UIKit

@MainActor
class DocumentManager: ObservableObject {
    static let shared = DocumentManager()

    @Published var documents: [Document] = []
    @Published var isLoading = false
    @Published var isUploading = false
    @Published var uploadProgress: Double = 0.0
    @Published var error: String?

    private let apiService = APIService.shared

    private init() {}

    // MARK: - Document Fetching

    func fetchDocuments() async {
        isLoading = true
        error = nil

        do {
            documents = try await apiService.fetchDocuments()

            // Sort by upload date (most recent first)
            documents.sort { ($0.uploadDate ?? Date.distantPast) > ($1.uploadDate ?? Date.distantPast) }
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    // MARK: - Document Upload

    func uploadDocument(fileURL: URL, filename: String) async {
        isUploading = true
        uploadProgress = 0.0
        error = nil

        do {
            let data = try Data(contentsOf: fileURL)

            // Simulate progress (real implementation would track actual upload)
            uploadProgress = 0.3
            HapticManager.shared.impact(.light)

            let document = try await apiService.uploadDocument(file: data, filename: filename)

            uploadProgress = 1.0
            documents.insert(document, at: 0)

            HapticManager.shared.success()
        } catch {
            self.error = error.localizedDescription
            HapticManager.shared.error()
        }

        isUploading = false
        uploadProgress = 0.0
    }

    // MARK: - Document Management

    func deleteDocument(_ documentId: String) async {
        do {
            try await apiService.deleteDocument(id: documentId)

            // Remove from local state
            documents.removeAll(where: { $0.id == documentId })

            HapticManager.shared.success()
        } catch {
            self.error = error.localizedDescription
            HapticManager.shared.error()
        }
    }

    func assignToClass(documentId: String, classId: String) async {
        do {
            try await apiService.assignDocumentToClass(
                documentId: documentId,
                classId: classId,
                action: "assign"
            )

            // Update local state
            if let index = documents.firstIndex(where: { $0.id == documentId }) {
                if !documents[index].assignedClasses.contains(classId) {
                    documents[index].assignedClasses.append(classId)
                }
            }

            HapticManager.shared.success()
        } catch {
            self.error = error.localizedDescription
            HapticManager.shared.error()
        }
    }

    func unassignFromClass(documentId: String, classId: String) async {
        do {
            try await apiService.assignDocumentToClass(
                documentId: documentId,
                classId: classId,
                action: "unassign"
            )

            // Update local state
            if let index = documents.firstIndex(where: { $0.id == documentId }) {
                documents[index].assignedClasses.removeAll(where: { $0 == classId })
            }

            HapticManager.shared.success()
        } catch {
            self.error = error.localizedDescription
            HapticManager.shared.error()
        }
    }

    // MARK: - Filtering & Sorting

    func getDocuments(for classId: String?) -> [Document] {
        guard let classId = classId else {
            return documents
        }
        return documents.filter { $0.assignedClasses.contains(classId) }
    }

    func searchDocuments(query: String) -> [Document] {
        guard !query.isEmpty else {
            return documents
        }
        return documents.filter { $0.filename.localizedCaseInsensitiveContains(query) }
    }

    // MARK: - Helper Methods

    func formatFileSize(_ bytes: Int?) -> String {
        guard let bytes = bytes else {
            return "Unknown size"
        }

        let formatter = ByteCountFormatter()
        formatter.allowedUnits = [.useKB, .useMB, .useGB]
        formatter.countStyle = .file
        return formatter.string(fromByteCount: Int64(bytes))
    }

    func fileTypeIcon(for fileType: String) -> String {
        switch fileType.lowercased() {
        case "pdf":
            return "doc.fill"
        case "doc", "docx":
            return "doc.text.fill"
        case "txt":
            return "doc.plaintext.fill"
        case "md", "markdown":
            return "doc.richtext.fill"
        default:
            return "doc.fill"
        }
    }

    func validateFileType(_ url: URL) -> Bool {
        let allowedTypes: [UTType] = [.pdf, .plainText, .text, .data]
        let allowedExtensions = ["pdf", "txt", "md", "doc", "docx"]

        if let type = UTType(filenameExtension: url.pathExtension) {
            if allowedTypes.contains(where: { type.conforms(to: $0) }) {
                return true
            }
        }

        return allowedExtensions.contains(url.pathExtension.lowercased())
    }
}
