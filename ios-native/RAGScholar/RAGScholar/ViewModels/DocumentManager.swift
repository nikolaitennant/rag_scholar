//
//  DocumentManager.swift
//  RAGScholar
//
//  Manages document uploads and assignments
//

import Foundation
import Combine
import UniformTypeIdentifiers
import UIKit

@MainActor
class DocumentManager: ObservableObject {
    static let shared = DocumentManager()

    @Published var documents: [Document] = []
    @Published var isLoading = false
    @Published var isUploading = false
    @Published var uploadProgress: Double = 0.0
    @Published var error: String?
    @Published var searchQuery: String = ""
    @Published var showAllDocuments: Bool = false

    private let apiService = APIService.shared

    private init() {}

    // MARK: - Document Fetching

    func fetchDocuments() async {
        isLoading = true
        error = nil

        do {
            documents = try await apiService.fetchDocuments()

            // Sort by upload date (most recent first) - using string comparison
            documents.sort { ($0.uploadDate ?? "") > ($1.uploadDate ?? "") }
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    // MARK: - Document Upload

    func uploadDocument(fileURL: URL, filename: String, classId: String? = nil) async {
        isUploading = true
        uploadProgress = 0.0
        error = nil

        do {
            let data = try Data(contentsOf: fileURL)

            // Simulate progress (real implementation would track actual upload)
            uploadProgress = 0.3
            HapticManager.shared.impact(.light)

            // Get API key from UserDefaults
            let apiKey = UserDefaults.standard.string(forKey: "api_key")

            let document = try await apiService.uploadDocument(
                file: data,
                filename: filename,
                collection: "database",
                apiKey: apiKey
            )

            // Assign to class if classId is provided
            if let classId = classId {
                try await apiService.assignDocumentToClass(
                    documentId: document.id,
                    documentSource: document.collection ?? "database",
                    classId: classId,
                    operation: "add",
                    apiKey: apiKey
                )
            }

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

    func assignDocumentToClass(documentId: String, documentSource: String, classId: String) async {
        let apiKey = UserDefaults.standard.string(forKey: "api_key")

        do {
            try await apiService.assignDocumentToClass(
                documentId: documentId,
                documentSource: documentSource,
                classId: classId,
                operation: "add",
                apiKey: apiKey
            )

            // Refresh documents to get updated assignments
            await fetchDocuments()

            HapticManager.shared.success()
        } catch {
            self.error = error.localizedDescription
            HapticManager.shared.error()
        }
    }

    func removeDocumentFromClass(documentId: String, documentSource: String, classId: String) async {
        let apiKey = UserDefaults.standard.string(forKey: "api_key")

        do {
            try await apiService.assignDocumentToClass(
                documentId: documentId,
                documentSource: documentSource,
                classId: classId,
                operation: "remove",
                apiKey: apiKey
            )

            // Refresh documents to get updated assignments
            await fetchDocuments()

            HapticManager.shared.success()
        } catch {
            self.error = error.localizedDescription
            HapticManager.shared.error()
        }
    }

    func deleteDocument(_ documentId: String) async {
        do {
            let apiKey = UserDefaults.standard.string(forKey: "api_key")
            try await apiService.deleteDocument(id: documentId, apiKey: apiKey)

            // Remove from local state
            documents.removeAll(where: { $0.id == documentId })

            HapticManager.shared.success()
        } catch {
            self.error = error.localizedDescription
            HapticManager.shared.error()
        }
    }

    func updateDocument(_ documentId: String, filename: String) async {
        do {
            let apiKey = UserDefaults.standard.string(forKey: "api_key")
            let updatedDoc = try await apiService.updateDocument(
                id: documentId,
                filename: filename,
                apiKey: apiKey
            )

            // Update local state
            if let index = documents.firstIndex(where: { $0.id == documentId }) {
                documents[index] = updatedDoc
            }

            HapticManager.shared.success()
        } catch {
            self.error = error.localizedDescription
            HapticManager.shared.error()
        }
    }

    func assignToClass(documentId: String, documentSource: String, classId: String) async {
        do {
            let apiKey = UserDefaults.standard.string(forKey: "api_key")
            try await apiService.assignDocumentToClass(
                documentId: documentId,
                documentSource: documentSource,
                classId: classId,
                operation: "add",
                apiKey: apiKey
            )

            // Update local state
            if let index = documents.firstIndex(where: { $0.id == documentId }) {
                var assignedClasses = documents[index].assignedClasses ?? []
                if !assignedClasses.contains(classId) {
                    assignedClasses.append(classId)
                    documents[index].assignedClasses = assignedClasses
                }
            }

            HapticManager.shared.success()
        } catch {
            self.error = error.localizedDescription
            HapticManager.shared.error()
        }
    }

    func unassignFromClass(documentId: String, documentSource: String, classId: String) async {
        do {
            let apiKey = UserDefaults.standard.string(forKey: "api_key")
            try await apiService.assignDocumentToClass(
                documentId: documentId,
                documentSource: documentSource,
                classId: classId,
                operation: "remove",
                apiKey: apiKey
            )

            // Update local state
            if let index = documents.firstIndex(where: { $0.id == documentId }) {
                var assignedClasses = documents[index].assignedClasses ?? []
                assignedClasses.removeAll(where: { $0 == classId })
                documents[index].assignedClasses = assignedClasses
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
        return documents.filter { $0.assignedClasses?.contains(classId) ?? false }
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
