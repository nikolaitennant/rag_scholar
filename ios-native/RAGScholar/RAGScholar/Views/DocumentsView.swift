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
    @State private var showManageClasses = false
    @State private var selectedTab = 0 // 0 = Current Class, 1 = All Docs
    @State private var isEditMode = false
    @State private var selectedDocuments: Set<String> = []
    @State private var isSearchActive = false

    var body: some View {
        VStack(spacing: 0) {
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
                            DocumentCard(
                                document: document,
                                isInCurrentClass: isDocumentInCurrentClass(document),
                                showingAllDocs: selectedTab == 1,
                                isEditMode: isEditMode,
                                isSelected: selectedDocuments.contains(document.id),
                                onSelect: {
                                    if selectedDocuments.contains(document.id) {
                                        selectedDocuments.remove(document.id)
                                    } else {
                                        selectedDocuments.insert(document.id)
                                    }
                                },
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
                            .fill(colorScheme == .dark ? Color(red: 0.11, green: 0.11, blue: 0.12) : Color.white)
                            .ignoresSafeArea(edges: .bottom)
                    )
            }
        }
        .sheet(isPresented: $showManageClasses) {
            ManageClassesView()
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
        .background(colorScheme == .dark ? Color(red: 0.11, green: 0.11, blue: 0.11) : .white)
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(colorScheme == .dark ? Color(red: 0.11, green: 0.11, blue: 0.11) : .white, for: .navigationBar)
        .toolbarBackground(.visible, for: .navigationBar)
        .toolbarColorScheme(colorScheme == .dark ? .dark : .light, for: .navigationBar)
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
                            showManageClasses = true
                        }) {
                            Label("Manage Classes", systemImage: "folder.badge.gearshape")
                        }
                    } label: {
                        HStack(spacing: 4) {
                            Text(classManager.activeClass?.name ?? "Select Class")
                                .font(.system(size: 15))
                                .foregroundColor(colorScheme == .dark ? .white : .black)
                                .lineLimit(1)
                            Image(systemName: "chevron.down")
                                .font(.system(size: 12))
                                .foregroundColor(colorScheme == .dark ? .white : .black)
                        }
                    }
                }

                // Trailing items
                if !isEditMode {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button {
                            withAnimation {
                                isSearchActive = true
                            }
                        } label: {
                            Image(systemName: "magnifyingglass")
                                .font(.system(size: 16))
                                .foregroundColor(colorScheme == .dark ? .white : .black)
                        }
                    }

                    ToolbarItem(placement: .topBarTrailing) {
                        Button {
                            showingDocumentPicker = true
                        } label: {
                            Image(systemName: "plus")
                                .font(.system(size: 16))
                                .foregroundColor(colorScheme == .dark ? .white : .black)
                        }
                    }
                }

                ToolbarItem(placement: .topBarTrailing) {
                    Button(isEditMode ? "Done" : "Select") {
                        withAnimation {
                            isEditMode.toggle()
                            if !isEditMode {
                                selectedDocuments.removeAll()
                            }
                        }
                    }
                    .font(.system(size: 15))
                    .foregroundColor(colorScheme == .dark ? .white : .black)
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
                        Button(action: { /* Rename */ }) {
                            Label("Rename", systemImage: "pencil")
                        }
                    }
                }
            }
        }
        .toolbarBackground(.visible, for: .bottomBar)
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
    let onSelect: () -> Void
    let onDelete: () -> Void

    @EnvironmentObject var documentManager: DocumentManager
    @Environment(\.colorScheme) var colorScheme

    var body: some View {
        HStack(spacing: 12) {
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
                .font(.title2)
                .foregroundColor(Color(red: 0.61, green: 0.42, blue: 1.0))
                .frame(width: 44, height: 44)
                .background(
                    Circle()
                        .fill(Color(red: 0.61, green: 0.42, blue: 1.0).opacity(0.2))
                )
                .overlay(
                    // Badge if in current class when showing all docs
                    Group {
                        if showingAllDocs && isInCurrentClass {
                            Circle()
                                .fill(Color(red: 0.61, green: 0.42, blue: 1.0))
                                .frame(width: 12, height: 12)
                                .overlay(
                                    Circle()
                                        .stroke(colorScheme == .dark ? Color(red: 0.11, green: 0.11, blue: 0.11) : Color.white, lineWidth: 2)
                                )
                                .offset(x: 14, y: -14)
                        }
                    }
                )

            VStack(alignment: .leading, spacing: 4) {
                Text(document.filename)
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(colorScheme == .dark ? .white : .black)
                    .lineLimit(1)

                HStack(spacing: 12) {
                    if let chunks = document.chunks {
                        Label("\(chunks) chunks", systemImage: "doc.text")
                    }

                    if let uploadDate = document.uploadDate {
                        Text(uploadDate)
                    }
                }
                .font(.system(size: 13))
                .foregroundColor(colorScheme == .dark ? .white.opacity(0.6) : .black.opacity(0.6))

                // Assigned Classes
                if let assignedClasses = document.assignedClasses, !assignedClasses.isEmpty {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 6) {
                            ForEach(assignedClasses, id: \.self) { classId in
                                ClassBadge(classId: classId)
                            }
                        }
                    }
                }
            }

            Spacer()

            if !isEditMode {
                Image(systemName: "chevron.right")
                    .font(.system(size: 14))
                    .foregroundColor(colorScheme == .dark ? .white.opacity(0.3) : .black.opacity(0.3))
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(
                    isEditMode && isSelected
                        ? (colorScheme == .dark ? Color(red: 0.61, green: 0.42, blue: 1.0).opacity(0.1) : Color(red: 0.61, green: 0.42, blue: 1.0).opacity(0.08))
                        : (colorScheme == .dark ? Color.white.opacity(0.05) : Color.black.opacity(0.05))
                )
        )
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(
                    isEditMode && isSelected
                        ? Color(red: 0.61, green: 0.42, blue: 1.0).opacity(0.3)
                        : Color.clear,
                    lineWidth: 2
                )
        )
        .contentShape(Rectangle())
        .onTapGesture {
            if isEditMode {
                onSelect()
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
