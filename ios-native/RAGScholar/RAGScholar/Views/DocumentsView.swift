//
//  DocumentsView.swift
//  RAGScholar
//
//  Documents library with upload and management
//

import SwiftUI
import UniformTypeIdentifiers

struct DocumentsView: View {
    @EnvironmentObject var documentManager: DocumentManager
    @EnvironmentObject var classManager: ClassManager
    @EnvironmentObject var rewardsManager: RewardsManager
    @Environment(\.colorScheme) var colorScheme

    @State private var showingDocumentPicker = false
    @State private var searchText = ""
    @State private var selectedDocument: Document?
    @State private var showingDeleteConfirmation = false

    var body: some View {
        VStack(spacing: 0) {
            // Search Bar
            HStack(spacing: 12) {
                HStack(spacing: 8) {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(colorScheme == .dark ? .white.opacity(0.5) : .black.opacity(0.4))

                    TextField("Search documents...", text: $searchText)
                        .textFieldStyle(.plain)
                        .foregroundColor(colorScheme == .dark ? .white : .black)
                }
                .padding(12)
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(colorScheme == .dark ? Color.white.opacity(0.1) : Color.black.opacity(0.05))
                )

                Button(action: { showingDocumentPicker = true }) {
                    Image(systemName: "plus.circle.fill")
                        .font(.system(size: 32))
                        .foregroundColor(Color(red: 0.43, green: 0.37, blue: 0.99))
                }
            }
            .padding()

            // Documents List
            ScrollView {
                LazyVStack(spacing: 12) {
                    let filteredDocs = filteredDocuments

                    if filteredDocs.isEmpty {
                        EmptyDocumentsState()
                            .padding(.top, 60)
                    } else {
                        ForEach(filteredDocs) { document in
                            DocumentCard(
                                document: document,
                                onDelete: {
                                    selectedDocument = document
                                    showingDeleteConfirmation = true
                                }
                            )
                        }
                    }
                }
                .padding(.horizontal)
                .padding(.bottom, 100)
            }

            // Upload Progress
            if documentManager.isUploading {
                UploadProgressView(progress: documentManager.uploadProgress)
                    .padding()
                    .background(
                        Rectangle()
                            .fill(Color(red: 0.11, green: 0.11, blue: 0.12))
                            .ignoresSafeArea(edges: .bottom)
                    )
            }
        }
        .sheet(isPresented: $showingDocumentPicker) {
            DocumentPicker { url in
                Task {
                    await documentManager.uploadDocument(fileURL: url, filename: url.lastPathComponent)
                    await rewardsManager.trackDocumentUploaded()
                }
            }
        }
        .alert("Delete Document", isPresented: $showingDeleteConfirmation) {
            Button("Cancel", role: .cancel) { }
            Button("Delete", role: .destructive) {
                if let document = selectedDocument {
                    Task {
                        await documentManager.deleteDocument(document.id)
                    }
                }
            }
        } message: {
            if let document = selectedDocument {
                Text("Are you sure you want to delete '\(document.filename)'? This action cannot be undone.")
            }
        }
        .background(Color(red: 0.11, green: 0.11, blue: 0.11)) // ChatGPT-like greyish black
        .onAppear {
            Task {
                await documentManager.fetchDocuments()
            }
        }
    }

    private var filteredDocuments: [Document] {
        if searchText.isEmpty {
            if let classId = classManager.activeClass?.id {
                return documentManager.getDocuments(for: classId)
            }
            return documentManager.documents
        }
        return documentManager.searchDocuments(query: searchText)
    }
}

// MARK: - Document Card

struct DocumentCard: View {
    let document: Document
    let onDelete: () -> Void

    @EnvironmentObject var documentManager: DocumentManager

    var body: some View {
        HStack(spacing: 12) {
            // File Type Icon
            Image(systemName: documentManager.fileTypeIcon(for: document.fileType))
                .font(.title2)
                .foregroundColor(.purple.opacity(0.8))
                .frame(width: 44, height: 44)
                .background(
                    Circle()
                        .fill(Color.purple.opacity(0.2))
                )

            VStack(alignment: .leading, spacing: 4) {
                Text(document.filename)
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(.white)
                    .lineLimit(1)

                HStack(spacing: 12) {
                    Label("\(document.chunks) chunks", systemImage: "doc.text")

                    if let size = document.size {
                        Text(documentManager.formatFileSize(size))
                    }

                    if let uploadDate = document.uploadDate {
                        Text(formatDate(uploadDate))
                    }
                }
                .font(.system(size: 13))
                .foregroundColor(.white.opacity(0.6))

                // Assigned Classes
                if !document.assignedClasses.isEmpty {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 6) {
                            ForEach(document.assignedClasses, id: \.self) { classId in
                                ClassBadge(classId: classId)
                            }
                        }
                    }
                }
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.system(size: 14))
                .foregroundColor(.white.opacity(0.3))
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.white.opacity(0.05))
        )
        .swipeActions(edge: .trailing, allowsFullSwipe: false) {
            Button(role: .destructive, action: onDelete) {
                Label("Delete", systemImage: "trash")
            }
        }
    }

    private func formatDate(_ date: Date) -> String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter.localizedString(for: date, relativeTo: Date())
    }
}

// MARK: - Class Badge

struct ClassBadge: View {
    let classId: String

    @EnvironmentObject var classManager: ClassManager

    var body: some View {
        if let userClass = classManager.classes.first(where: { $0.id == classId }) {
            Text(userClass.domainType.shortName)
                .font(.system(size: 10, weight: .semibold))
                .foregroundColor(.white)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(
                    RoundedRectangle(cornerRadius: 6)
                        .fill(Color.purple.opacity(0.3))
                )
        }
    }
}

// MARK: - Upload Progress View

struct UploadProgressView: View {
    let progress: Double

    var body: some View {
        VStack(spacing: 8) {
            HStack {
                Text("Uploading...")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(.white)

                Spacer()

                Text("\(Int(progress * 100))%")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.white.opacity(0.7))
            }

            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color.white.opacity(0.2))
                        .frame(height: 6)

                    RoundedRectangle(cornerRadius: 4)
                        .fill(
                            LinearGradient(
                                colors: [Color(red: 0.43, green: 0.37, blue: 0.99), Color(red: 0.62, green: 0.47, blue: 1)],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .frame(width: geometry.size.width * progress, height: 6)
                        .animation(.easeInOut, value: progress)
                }
            }
            .frame(height: 6)
        }
    }
}

// MARK: - Empty State

struct EmptyDocumentsState: View {
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "doc.badge.plus")
                .font(.system(size: 64))
                .foregroundColor(.white.opacity(0.3))

            VStack(spacing: 8) {
                Text("No Documents Yet")
                    .font(.system(size: 24, weight: .bold))
                    .foregroundColor(.white)

                Text("Upload documents to get started")
                    .font(.system(size: 16))
                    .foregroundColor(.white.opacity(0.6))
                    .multilineTextAlignment(.center)
            }

            Text("Supported: PDF, DOC, DOCX, TXT, MD")
                .font(.system(size: 13))
                .foregroundColor(.white.opacity(0.4))
                .padding(.top, 8)
        }
        .padding()
    }
}

// MARK: - Document Picker

struct DocumentPicker: UIViewControllerRepresentable {
    let onDocumentPicked: (URL) -> Void

    func makeUIViewController(context: Context) -> UIDocumentPickerViewController {
        let picker = UIDocumentPickerViewController(forOpeningContentTypes: [
            .pdf,
            .plainText,
            .text,
            UTType(filenameExtension: "doc") ?? .data,
            UTType(filenameExtension: "docx") ?? .data,
            UTType(filenameExtension: "md") ?? .data
        ], asCopy: true)

        picker.delegate = context.coordinator
        picker.allowsMultipleSelection = false

        return picker
    }

    func updateUIViewController(_ uiViewController: UIDocumentPickerViewController, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    class Coordinator: NSObject, UIDocumentPickerDelegate {
        let parent: DocumentPicker

        init(_ parent: DocumentPicker) {
            self.parent = parent
        }

        func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
            guard let url = urls.first else { return }
            parent.onDocumentPicked(url)
        }
    }
}

#Preview {
    DocumentsView()
        .environmentObject(DocumentManager.shared)
        .environmentObject(ClassManager.shared)
        .environmentObject(RewardsManager.shared)
        .background(Color.black)
}
