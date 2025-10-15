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
    @EnvironmentObject var navigationManager: NavigationManager
    @Environment(\.colorScheme) var colorScheme

    @State private var showingDocumentPicker = false
    @State private var searchText = ""
    @State private var selectedDocument: Document?
    @State private var showingDeleteConfirmation = false
    @State private var selectedTab = 0 // 0 = Current Class, 1 = All Docs
    @State private var isEditMode = false
    @State private var selectedDocuments: Set<String> = []
    @State private var isSearchActive = false
    @State private var showingRenameAlert = false
    @State private var documentToRename: Document?
    @State private var newDocumentName = ""
    @State private var documentToPreview: Document?
    @State private var showingClassesSheet = false
    @State private var expandedClassesDocId: String?

    var body: some View {
        VStack(spacing: 0) {
            // Title Header
            HStack {
                Text("Documents")
                    .font(.system(size: 34, weight: .bold))
                    .foregroundColor(colorScheme == .dark ? .white : .black)
                Spacer()
            }
            .padding(.horizontal, 105)
            .padding(.top, 8)
            .padding(.bottom, 12)
            .background(colorScheme == .dark ? Color(red: 0.11, green: 0.11, blue: 0.11) : .white)

            // Segmented Control
            VStack(spacing: 0) {
                Picker("View", selection: $selectedTab) {
                    Text("Current Class").tag(0)
                    Text("All Docs").tag(1)
                }
                .pickerStyle(SegmentedPickerStyle())
                .padding(.horizontal, 80)
                .padding(.top, 12)
                .padding(.bottom, 12)
                .colorScheme(colorScheme)
                .onChange(of: selectedTab) { _, newValue in
                    documentManager.showAllDocuments = (newValue == 1)
                    isEditMode = false
                    selectedDocuments.removeAll()
                }
            }
            .background(colorScheme == .dark ? Color(red: 0.11, green: 0.11, blue: 0.11) : .white)


            // Documents List
            ScrollView {
                LazyVStack(spacing: 12) {
                    Spacer()
                        .frame(height: 20)
                    let filteredDocs = filteredDocuments

                    if filteredDocs.isEmpty {
                        EmptyDocumentsState()
                    } else {
                        ForEach(filteredDocs) { document in
                            GlassEffectContainer {
                                DocumentCard(
                                    document: document,
                                    isInCurrentClass: isDocumentInCurrentClass(document),
                                    showingAllDocs: selectedTab == 1,
                                    isEditMode: isEditMode,
                                    isSelected: selectedDocuments.contains(document.id),
                                    expandedClassesDocId: $expandedClassesDocId,
                                    onSelect: {
                                        if selectedDocuments.contains(document.id) {
                                            selectedDocuments.remove(document.id)
                                        } else {
                                            selectedDocuments.insert(document.id)
                                        }
                                    },
                                    onTap: {
                                        documentToPreview = document
                                    },
                                    onDelete: {
                                        selectedDocument = document
                                        showingDeleteConfirmation = true
                                    }
                                )
                                .glassEffect(in: RoundedRectangle(cornerRadius: 16))
                            }
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
                            .fill(colorScheme == .dark ? Color(red: 0.11, green: 0.11, blue: 0.12) : Color.white)
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
        .sheet(item: $documentToPreview) { document in
            DocumentPreviewView(document: document)
        }
        .alert("Rename Document", isPresented: $showingRenameAlert) {
            TextField("Document name", text: $newDocumentName)
            Button("Cancel", role: .cancel) {
                documentToRename = nil
                newDocumentName = ""
            }
            Button("Rename") {
                if let doc = documentToRename {
                    Task {
                        await documentManager.updateDocument(doc.id, filename: newDocumentName)
                        documentToRename = nil
                        newDocumentName = ""
                        isEditMode = false
                        selectedDocuments.removeAll()
                    }
                }
            }
        } message: {
            Text("Enter a new name for the document")
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
        .background(colorScheme == .dark ? Color(red: 0.11, green: 0.11, blue: 0.11) : .white)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if isSearchActive {
                // Search mode - search field takes up entire toolbar
                ToolbarItem(placement: .principal) {
                    HStack(spacing: 8) {
                        GlassEffectContainer {
                            HStack(spacing: 0) {
                                Image(systemName: "magnifyingglass")
                                    .font(.system(size: 16, weight: .medium))
                                    .foregroundColor(colorScheme == .dark ? .white.opacity(0.6) : .black.opacity(0.5))
                                    .padding(.leading, 16)

                                TextField("Search documents...", text: $searchText)
                                    .textFieldStyle(.plain)
                                    .font(.system(size: 17, weight: .regular))
                                    .foregroundColor(colorScheme == .dark ? .white : .black)
                                    .tint(Color(red: 0.61, green: 0.42, blue: 1.0))
                                    .padding(.horizontal, 12)

                                if !searchText.isEmpty {
                                    Button {
                                        searchText = ""
                                    } label: {
                                        Image(systemName: "xmark.circle.fill")
                                            .font(.system(size: 16))
                                            .foregroundColor(colorScheme == .dark ? .white.opacity(0.6) : .black.opacity(0.5))
                                    }
                                    .padding(.trailing, 16)
                                } else {
                                    Spacer()
                                        .frame(width: 16)
                                }
                            }
                            .padding(.vertical, 10)
                            .glassEffect(in: Capsule())
                        }
                        .frame(minWidth: 0, maxWidth: .infinity)
                    }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        withAnimation {
                            isSearchActive = false
                            searchText = ""
                        }
                    } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 16))
                            .foregroundColor(colorScheme == .dark ? .white : .black)
                    }
                }
            } else {
                // Leading items - Class dropdown
                ToolbarItem(placement: .topBarLeading) {
                    Menu {
                        ForEach(classManager.classes) { userClass in
                            Button(action: {
                                classManager.selectClass(userClass)
                            }) {
                                HStack {
                                    Text(userClass.name)
                                    if classManager.activeClass?.id == userClass.id {
                                        Image(systemName: "checkmark")
                                    }
                                }
                            }
                        }

                        Divider()

                        Button(action: {
                            navigationManager.selectedTab = .classes
                        }) {
                            Label("Manage Classes", systemImage: "folder.badge.gearshape")
                        }
                    } label: {
                        HStack(spacing: 4) {
                            Text(classManager.activeClass?.name ?? "Select Class")
                                .lineLimit(1)
                            Image(systemName: "chevron.down")
                        }
                    }
                }

                    // Trailing items
                    if !isEditMode {
                        // First capsule: Search + Add
                        ToolbarItem(id: "search") {
                            Button {
                                withAnimation { isSearchActive = true }
                            } label: {
                                Image(systemName: "magnifyingglass")
                            }
                        }

                        ToolbarItem(id: "add") {
                            Button {
                                showingDocumentPicker = true
                            } label: {
                                Image(systemName: "plus")
                            }
                        }

                        // Break grouping between icon capsule and Edit capsule
                        ToolbarSpacer(.fixed)

                        // Second capsule: Edit (prominent style)
                        ToolbarItem(id: "edit", placement: .topBarTrailing) {
                            Button("Edit") {
                                withAnimation(.easeInOut(duration: 0.25)) {
                                    isEditMode = true
                                    selectedDocuments.removeAll()
                                }
                            }
                            .transition(.opacity)
                        }

                    } else {
                        // When editing: single "Done" button
                        ToolbarItem(id: "done", placement: .topBarTrailing) {
                            Button("Done") {
                                withAnimation(.easeInOut(duration: 0.25)) {
                                    isEditMode = false
                                    selectedDocuments.removeAll()
                                }
                            }
                            .fontWeight(.semibold)
                            .transition(.opacity)
                        }
                    }
                }
            // Bottom toolbar items
            if isEditMode && !selectedDocuments.isEmpty {
                ToolbarItem(placement: .bottomBar) {
                    Button(action: deleteSelectedDocuments) {
                        Label("Delete", systemImage: "trash")
                    }
                    .tint(.red)
                }

                ToolbarItem(placement: .bottomBar) {
                    Spacer()
                }

                ToolbarItem(placement: .bottomBar) {
                    Button(action: { /* Assign to class */ }) {
                        Label("Add to Class", systemImage: "folder.badge.plus")
                    }
                }

                if selectedDocuments.count == 1 {
                    ToolbarItem(placement: .bottomBar) {
                        Spacer()
                    }

                    ToolbarItem(placement: .bottomBar) {
                        Button(action: {
                            if let docId = selectedDocuments.first,
                               let doc = documentManager.documents.first(where: { $0.id == docId }) {
                                documentToRename = doc
                                newDocumentName = doc.filename
                                showingRenameAlert = true
                            }
                        }) {
                            Label("Rename", systemImage: "pencil")
                        }
                    }
                }
            }
        }
        .toolbar(isEditMode ? .hidden : .visible, for: .tabBar)
        .onAppear {
            Task {
                await documentManager.fetchDocuments()
            }
        }
    }

    private var filteredDocuments: [Document] {
        let baseDocuments: [Document]

        if documentManager.showAllDocuments {
            baseDocuments = documentManager.documents
        } else {
            if let classId = classManager.activeClass?.id {
                baseDocuments = documentManager.getDocuments(for: classId)
            } else {
                baseDocuments = documentManager.documents
            }
        }

        // Apply search filter
        if searchText.isEmpty {
            return baseDocuments
        } else {
            return baseDocuments.filter { document in
                document.filename.localizedCaseInsensitiveContains(searchText)
            }
        }
    }

    private func isDocumentInCurrentClass(_ document: Document) -> Bool {
        guard let classId = classManager.activeClass?.id else { return false }
        return document.assignedClasses?.contains(classId) ?? false
    }

    private func deleteSelectedDocuments() {
        for docId in selectedDocuments {
            Task {
                await documentManager.deleteDocument(docId)
            }
        }
        selectedDocuments.removeAll()
        isEditMode = false
    }
}

// MARK: - Document Card

struct DocumentCard: View {
    let document: Document
    let isInCurrentClass: Bool
    let showingAllDocs: Bool
    let isEditMode: Bool
    let isSelected: Bool
    @Binding var expandedClassesDocId: String?
    let onSelect: () -> Void
    let onTap: () -> Void
    let onDelete: () -> Void

    @EnvironmentObject var documentManager: DocumentManager
    @EnvironmentObject var classManager: ClassManager
    @Environment(\.colorScheme) var colorScheme

    private var isExpanded: Bool {
        expandedClassesDocId == document.id
    }

    var body: some View {
        HStack(spacing: 14) {
            // Selection circle in edit mode
            if isEditMode {
                Button(action: onSelect) {
                    Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                        .font(.system(size: 24))
                        .foregroundColor(isSelected ? Color(red: 0.61, green: 0.42, blue: 1.0) : (colorScheme == .dark ? .white.opacity(0.3) : .black.opacity(0.3)))
                }
                .buttonStyle(.plain)
            }

            // File Type Icon
            Image(systemName: documentManager.fileTypeIcon(for: document.fileType ?? ""))
                .font(.system(size: 20, weight: .semibold))
                .foregroundColor(.black)
                .frame(width: 50, height: 50)
                .background(
                    Circle()
                        .fill(Color.black.opacity(0.08))
                )

            VStack(alignment: .leading, spacing: 6) {
                // Filename
                Text(document.filename)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(colorScheme == .dark ? .white : .black)
                    .lineLimit(1)

                // File size and upload date
                HStack(spacing: 8) {
                    // Show actual file size if available, otherwise estimate from chunks
                    if let fileSize = document.fileSize {
                        Text(ByteCountFormatter.string(fromByteCount: Int64(fileSize), countStyle: .file))
                            .font(.system(size: 13))
                            .foregroundColor(colorScheme == .dark ? .white.opacity(0.5) : .black.opacity(0.5))
                    } else if let chunks = document.chunks {
                        Text(estimateFileSize(chunks: chunks))
                            .font(.system(size: 13))
                            .foregroundColor(colorScheme == .dark ? .white.opacity(0.5) : .black.opacity(0.5))
                    }

                    if let uploadDate = document.uploadDate {
                        Text("•")
                            .foregroundColor(colorScheme == .dark ? .white.opacity(0.3) : .black.opacity(0.3))
                        Text(uploadDate)
                            .font(.system(size: 13))
                            .foregroundColor(colorScheme == .dark ? .white.opacity(0.5) : .black.opacity(0.5))
                    }
                }

                // Assigned Classes
                if let assignedClasses = document.assignedClasses, !assignedClasses.isEmpty {
                    ClassesDisplay(
                        classIds: assignedClasses,
                        isExpanded: isExpanded,
                        onToggleExpand: {
                            withAnimation(.easeInOut(duration: 0.2)) {
                                expandedClassesDocId = isExpanded ? nil : document.id
                            }
                        }
                    )
                }
            }

            Spacer()

            if !isEditMode {
                Image(systemName: "chevron.right")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(colorScheme == .dark ? .white.opacity(0.3) : .black.opacity(0.3))
            }
        }
        .padding(.horizontal, 18)
        .padding(.vertical, 14)
        .contentShape(Rectangle())
        .onTapGesture {
            if isEditMode {
                onSelect()
            } else {
                onTap()
            }
        }
        .swipeActions(edge: .trailing, allowsFullSwipe: false) {
            if !isEditMode {
                Button(role: .destructive, action: onDelete) {
                    Label("Delete", systemImage: "trash")
                }
            }
        }
    }

    private func estimateFileSize(chunks: Int) -> String {
        // Rough estimate: 1 chunk ≈ 1000 tokens ≈ 4KB
        let estimatedBytes = chunks * 4000
        return ByteCountFormatter.string(fromByteCount: Int64(estimatedBytes), countStyle: .file)
    }
}

// MARK: - Classes Display

struct ClassesDisplay: View {
    let classIds: [String]
    let isExpanded: Bool
    let onToggleExpand: () -> Void

    @EnvironmentObject var classManager: ClassManager
    @Environment(\.colorScheme) var colorScheme

    var body: some View {
        if classIds.count == 1, let classId = classIds.first,
           let userClass = classManager.classes.first(where: { $0.id == classId }) {
            // Single class bubble
            Text(userClass.name)
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(colorScheme == .dark ? .white : Color(red: 0.55, green: 0.35, blue: 0.9))
                .padding(.horizontal, 10)
                .padding(.vertical, 5)
                .background(
                    Capsule()
                        .fill(colorScheme == .dark ? Color(red: 0.61, green: 0.42, blue: 1.0).opacity(0.15) : Color(red: 0.61, green: 0.42, blue: 1.0).opacity(0.1))
                )
        } else if classIds.count > 1 {
            // Multiple classes
            if isExpanded {
                // Show all classes as bubbles
                HStack(spacing: 6) {
                    ForEach(classIds.prefix(3), id: \.self) { classId in
                        if let userClass = classManager.classes.first(where: { $0.id == classId }) {
                            Text(userClass.name)
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(colorScheme == .dark ? .white : Color(red: 0.55, green: 0.35, blue: 0.9))
                                .padding(.horizontal, 10)
                                .padding(.vertical, 5)
                                .background(
                                    Capsule()
                                        .fill(colorScheme == .dark ? Color(red: 0.61, green: 0.42, blue: 1.0).opacity(0.15) : Color(red: 0.61, green: 0.42, blue: 1.0).opacity(0.1))
                                )
                        }
                    }

                    if classIds.count > 3 {
                        Button(action: onToggleExpand) {
                            Text("+\(classIds.count - 3)")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(colorScheme == .dark ? .white.opacity(0.6) : .black.opacity(0.5))
                                .padding(.horizontal, 10)
                                .padding(.vertical, 5)
                                .background(
                                    Capsule()
                                        .fill(colorScheme == .dark ? Color.white.opacity(0.1) : Color.black.opacity(0.08))
                                )
                        }
                    } else {
                        Button(action: onToggleExpand) {
                            Image(systemName: "chevron.up")
                                .font(.system(size: 10, weight: .semibold))
                                .foregroundColor(colorScheme == .dark ? .white.opacity(0.6) : .black.opacity(0.5))
                                .padding(.horizontal, 8)
                                .padding(.vertical, 5)
                                .background(
                                    Capsule()
                                        .fill(colorScheme == .dark ? Color.white.opacity(0.1) : Color.black.opacity(0.08))
                                )
                        }
                    }
                }
            } else {
                // Show first class + count as bubble
                if let firstClassId = classIds.first,
                   let firstClass = classManager.classes.first(where: { $0.id == firstClassId }) {
                    Button(action: onToggleExpand) {
                        Text("\(firstClass.name) +\(classIds.count - 1)")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(colorScheme == .dark ? .white : Color(red: 0.55, green: 0.35, blue: 0.9))
                            .padding(.horizontal, 10)
                            .padding(.vertical, 5)
                            .background(
                                Capsule()
                                    .fill(colorScheme == .dark ? Color(red: 0.61, green: 0.42, blue: 1.0).opacity(0.15) : Color(red: 0.61, green: 0.42, blue: 1.0).opacity(0.1))
                            )
                    }
                }
            }
        }
    }
}

// MARK: - Document Preview View

struct DocumentPreviewView: View {
    let document: Document
    @EnvironmentObject var classManager: ClassManager
    @EnvironmentObject var documentManager: DocumentManager
    @Environment(\.dismiss) var dismiss
    @Environment(\.colorScheme) var colorScheme
    @State private var documentURL: URL?
    @State private var isLoading = true
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            ZStack {
                if isLoading {
                    VStack(spacing: 16) {
                        ProgressView()
                            .scaleEffect(1.2)
                        Text("Loading document...")
                            .font(.system(size: 15))
                            .foregroundColor(colorScheme == .dark ? .white.opacity(0.6) : .black.opacity(0.5))
                    }
                } else if let errorMessage = errorMessage {
                    VStack(spacing: 16) {
                        Image(systemName: "exclamationmark.triangle")
                            .font(.system(size: 48))
                            .foregroundColor(colorScheme == .dark ? .white.opacity(0.3) : .black.opacity(0.3))
                        Text(errorMessage)
                            .font(.system(size: 15))
                            .foregroundColor(colorScheme == .dark ? .white.opacity(0.6) : .black.opacity(0.5))
                            .multilineTextAlignment(.center)
                            .padding(.horizontal)
                    }
                } else if let url = documentURL {
                    // Display document preview
                    DocumentQuickLookView(url: url)
                        .ignoresSafeArea(edges: .bottom)
                } else {
                    // Fallback: Show document info
                    ScrollView {
                        VStack(alignment: .leading, spacing: 24) {
                            // Document Info Section
                            VStack(alignment: .leading, spacing: 16) {
                                Text("Document Info")
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundColor(colorScheme == .dark ? .white.opacity(0.6) : .black.opacity(0.6))
                                    .textCase(.uppercase)

                                VStack(spacing: 12) {
                                    InfoRow(label: "File Type", value: document.fileType?.uppercased() ?? "Unknown")

                                    if let chunks = document.chunks {
                                        InfoRow(label: "Chunks", value: "\(chunks)")
                                    }

                                    if let uploadDate = document.uploadDate {
                                        InfoRow(label: "Upload Date", value: uploadDate)
                                    }

                                    if let collection = document.collection {
                                        InfoRow(label: "Collection", value: collection)
                                    }
                                }
                            }
                            .padding(.horizontal)

                            // Assigned Classes
                            if let assignedClasses = document.assignedClasses, !assignedClasses.isEmpty {
                                VStack(alignment: .leading, spacing: 16) {
                                    Text("Assigned Classes")
                                        .font(.system(size: 14, weight: .semibold))
                                        .foregroundColor(colorScheme == .dark ? .white.opacity(0.6) : .black.opacity(0.6))
                                        .textCase(.uppercase)

                                    VStack(spacing: 8) {
                                        ForEach(assignedClasses, id: \.self) { classId in
                                            if let userClass = classManager.classes.first(where: { $0.id == classId }) {
                                                HStack {
                                                    Image(systemName: userClass.domainType.icon)
                                                        .font(.system(size: 16))
                                                        .foregroundColor(Color(red: 0.61, green: 0.42, blue: 1.0))

                                                    Text(userClass.name)
                                                        .font(.system(size: 16, weight: .medium))
                                                        .foregroundColor(colorScheme == .dark ? .white : .black)

                                                    Spacer()

                                                    Text(userClass.domainType.displayName)
                                                        .font(.system(size: 14))
                                                        .foregroundColor(colorScheme == .dark ? .white.opacity(0.6) : .black.opacity(0.6))
                                                }
                                                .padding(12)
                                                .background(
                                                    RoundedRectangle(cornerRadius: 12)
                                                        .fill(colorScheme == .dark ? Color.white.opacity(0.05) : Color.black.opacity(0.05))
                                                )
                                            }
                                        }
                                    }
                                }
                                .padding(.horizontal)
                            }
                        }
                        .padding(.vertical)
                    }
                }
            }
            .background(colorScheme == .dark ? Color(red: 0.11, green: 0.11, blue: 0.11) : Color.white)
            .navigationTitle(document.filename)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(colorScheme == .dark ? .white : .black)
                    }
                }
            }
            .onAppear {
                loadDocument()
            }
        }
    }

    private func loadDocument() {
        isLoading = true
        errorMessage = nil

        Task {
            do {
                // First check if document is already cached
                if let cachedURL = documentManager.getCachedDocumentURL(for: document) {
                    await MainActor.run {
                        self.documentURL = cachedURL
                        self.isLoading = false
                    }
                    return
                }

                // If not cached, download and cache it
                let url = try await documentManager.downloadAndCacheDocument(documentId: document.id)
                await MainActor.run {
                    self.documentURL = url
                    self.isLoading = false
                }
            } catch {
                await MainActor.run {
                    self.isLoading = false
                    self.errorMessage = "Failed to load document: \(error.localizedDescription)"
                }
            }
        }
    }
}

// MARK: - Document QuickLook View

import QuickLook

struct DocumentQuickLookView: UIViewControllerRepresentable {
    let url: URL

    func makeUIViewController(context: Context) -> QLPreviewController {
        let controller = QLPreviewController()
        controller.dataSource = context.coordinator
        return controller
    }

    func updateUIViewController(_ uiViewController: QLPreviewController, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    class Coordinator: NSObject, QLPreviewControllerDataSource {
        let parent: DocumentQuickLookView

        init(_ parent: DocumentQuickLookView) {
            self.parent = parent
        }

        func numberOfPreviewItems(in controller: QLPreviewController) -> Int {
            return 1
        }

        func previewController(_ controller: QLPreviewController, previewItemAt index: Int) -> QLPreviewItem {
            return parent.url as QLPreviewItem
        }
    }
}

struct InfoRow: View {
    let label: String
    let value: String
    @Environment(\.colorScheme) var colorScheme

    var body: some View {
        HStack {
            Text(label)
                .font(.system(size: 15, weight: .medium))
                .foregroundColor(colorScheme == .dark ? .white.opacity(0.7) : .black.opacity(0.7))

            Spacer()

            Text(value)
                .font(.system(size: 15))
                .foregroundColor(colorScheme == .dark ? .white : .black)
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(colorScheme == .dark ? Color.white.opacity(0.05) : Color.black.opacity(0.05))
        )
    }
}

// MARK: - Upload Progress View

struct UploadProgressView: View {
    let progress: Double
    @Environment(\.colorScheme) var colorScheme

    var body: some View {
        VStack(spacing: 8) {
            HStack {
                Text("Uploading...")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(colorScheme == .dark ? .white : .black)

                Spacer()

                Text("\(Int(progress * 100))%")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(colorScheme == .dark ? .white.opacity(0.7) : .black.opacity(0.7))
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
    @Environment(\.colorScheme) var colorScheme

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "doc.badge.plus")
                .font(.system(size: 48))
                .foregroundColor(colorScheme == .dark ? .white.opacity(0.3) : .black.opacity(0.25))

            Text("No documents yet")
                .font(.system(size: 18, weight: .medium))
                .foregroundColor(colorScheme == .dark ? .white.opacity(0.6) : .black.opacity(0.5))

            Text("Upload documents to begin")
                .font(.system(size: 14))
                .foregroundColor(colorScheme == .dark ? .white.opacity(0.4) : .black.opacity(0.35))

            Text("PDF • DOC • DOCX • TXT • MD")
                .font(.system(size: 12))
                .foregroundColor(colorScheme == .dark ? .white.opacity(0.3) : .black.opacity(0.25))
                .padding(.top, 4)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 120)
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
        .environmentObject(DocumentManager.preview)
        .environmentObject(ClassManager.preview)
        .environmentObject(RewardsManager.preview)
        .background(Color.black)
}
