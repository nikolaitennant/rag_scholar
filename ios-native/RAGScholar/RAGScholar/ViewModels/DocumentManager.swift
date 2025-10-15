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
    private let fileManager = FileManager.default
    private let maxCacheSize: Int64 = 100 * 1024 * 1024 // 100 MB cache limit

    private var documentsDirectory: URL {
        fileManager.urls(for: .documentDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("CachedDocuments", isDirectory: true)
    }

    private init() {
        createCacheDirectoryIfNeeded()
    }

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

            // Cache the uploaded document locally (fire-and-forget)
            _ = try? await cacheDocument(data: data, for: document)

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

            // Remove from local cache
            if let document = documents.first(where: { $0.id == documentId }),
               let cachedURL = getCachedDocumentURL(for: document) {
                try? fileManager.removeItem(at: cachedURL)
            }

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

    // MARK: - Document Caching

    private func createCacheDirectoryIfNeeded() {
        if !fileManager.fileExists(atPath: documentsDirectory.path) {
            try? fileManager.createDirectory(at: documentsDirectory, withIntermediateDirectories: true)
        }
    }

    func getCachedDocumentURL(for document: Document) -> URL? {
        let cachedURL = documentsDirectory.appendingPathComponent("\(document.id).\(document.fileType ?? "pdf")")
        return fileManager.fileExists(atPath: cachedURL.path) ? cachedURL : nil
    }

    func cacheDocument(data: Data, for document: Document) async throws -> URL {
        // Check cache size before adding
        await cleanCacheIfNeeded()

        let cachedURL = documentsDirectory.appendingPathComponent("\(document.id).\(document.fileType ?? "pdf")")
        try data.write(to: cachedURL)

        // Update file attributes for cache management
        try fileManager.setAttributes([.modificationDate: Date()], ofItemAtPath: cachedURL.path)

        return cachedURL
    }

    func downloadAndCacheDocument(documentId: String) async throws -> URL {
        // First check if already cached
        if let document = documents.first(where: { $0.id == documentId }),
           let cachedURL = getCachedDocumentURL(for: document) {
            // Update access time
            try? fileManager.setAttributes([.modificationDate: Date()], ofItemAtPath: cachedURL.path)
            return cachedURL
        }

        // Backend doesn't currently store original files, only embeddings
        // Documents are only available if they were uploaded in this session
        throw NSError(
            domain: "DocumentManager",
            code: -2,
            userInfo: [NSLocalizedDescriptionKey: "Document not available for preview. Original file is not stored on the server."]
        )
    }

    private func cleanCacheIfNeeded() async {
        do {
            let cacheSize = try getCacheSize()

            if cacheSize > maxCacheSize {
                // Get all cached files sorted by last access time
                let contents = try fileManager.contentsOfDirectory(at: documentsDirectory, includingPropertiesForKeys: [.contentModificationDateKey], options: [.skipsHiddenFiles])

                let sortedFiles = try contents.sorted { file1, file2 in
                    let date1 = try file1.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate ?? Date.distantPast
                    let date2 = try file2.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate ?? Date.distantPast
                    return date1 < date2
                }

                // Remove oldest files until under limit
                var currentSize = cacheSize
                for file in sortedFiles {
                    if currentSize <= maxCacheSize / 2 { break } // Clean to 50% of max

                    let attributes = try fileManager.attributesOfItem(atPath: file.path)
                    let fileSize = attributes[.size] as? Int64 ?? 0

                    try fileManager.removeItem(at: file)
                    currentSize -= fileSize
                }
            }
        } catch {
            print("Cache cleanup error: \(error.localizedDescription)")
        }
    }

    private func getCacheSize() throws -> Int64 {
        let contents = try fileManager.contentsOfDirectory(at: documentsDirectory, includingPropertiesForKeys: [.fileSizeKey], options: [.skipsHiddenFiles])

        return try contents.reduce(0) { total, url in
            let attributes = try fileManager.attributesOfItem(atPath: url.path)
            let size = attributes[.size] as? Int64 ?? 0
            return total + size
        }
    }

    func clearCache() async {
        try? fileManager.removeItem(at: documentsDirectory)
        createCacheDirectoryIfNeeded()
    }

    func getCacheSizeFormatted() -> String {
        do {
            let size = try getCacheSize()
            return ByteCountFormatter.string(fromByteCount: size, countStyle: .file)
        } catch {
            return "Unknown"
        }
    }
}
