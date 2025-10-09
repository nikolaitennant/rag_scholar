//
//  ManageClassesView.swift
//  RAGScholar
//
//  Class management with liquid glass styling
//

import SwiftUI

struct ManageClassesView: View {
    @EnvironmentObject var classManager: ClassManager
    @Environment(\.colorScheme) var colorScheme

    @State private var showingCreateClass = false
    @State private var editingClass: UserClass?
    @State private var searchText = ""
    @State private var isSearchActive = false
    @State private var isEditMode = false
    @State private var selectedClasses: Set<String> = []

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Existing Classes
                if !filteredClasses.isEmpty {
                    GlassEffectContainer(spacing: 12) {
                        VStack(spacing: 12) {
                            ForEach(filteredClasses) { userClass in
                                ClassRow(
                                    userClass: userClass,
                                    isEditMode: isEditMode,
                                    isSelected: selectedClasses.contains(userClass.id),
                                    onSelect: {
                                        if selectedClasses.contains(userClass.id) {
                                            selectedClasses.remove(userClass.id)
                                        } else {
                                            selectedClasses.insert(userClass.id)
                                        }
                                    },
                                    onEdit: {
                                        editingClass = userClass
                                    }
                                )
                            }
                        }
                    }
                    .padding(.horizontal)
                    .padding(.top, 20)
                } else if !classManager.classes.isEmpty {
                    // Show empty state when search has no results
                    VStack(spacing: 12) {
                        Image(systemName: "magnifyingglass")
                            .font(.system(size: 48))
                            .foregroundColor(colorScheme == .dark ? .white.opacity(0.3) : .black.opacity(0.25))
                        Text("No classes found")
                            .font(.system(size: 18, weight: .medium))
                            .foregroundColor(colorScheme == .dark ? .white.opacity(0.6) : .black.opacity(0.5))
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 60)
                } else {
                    // Empty state when no classes exist
                    EmptyClassesState()
                }
            }
            .padding(.bottom, 80)
        }
        .background(colorScheme == .dark ? Color(red: 0.11, green: 0.11, blue: 0.11) : Color.white)
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(colorScheme == .dark ? Color(red: 0.11, green: 0.11, blue: 0.11) : Color.white, for: .navigationBar)
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

                                TextField("Search classes...", text: $searchText)
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
                // Trailing items (Liquid Glass style for ClassesView)
                if !isEditMode {
                    // First capsule: Search + Add Class
                    ToolbarItem(id: "search") {
                        Button {
                            withAnimation { isSearchActive = true }
                        } label: {
                            Image(systemName: "magnifyingglass")
                                .font(.system(size: 16))
                                .foregroundColor(colorScheme == .dark ? .white : .black)
                        }
                    }

                    ToolbarItem(id: "add") {
                        Button {
                            showingCreateClass = true
                        } label: {
                            Image(systemName: "plus")
                                .font(.system(size: 16))
                                .foregroundColor(colorScheme == .dark ? .white : .black)
                        }
                    }

                    // Break grouping between icon capsule and Edit capsule
                    ToolbarSpacer(.fixed)

                    // Second capsule: Edit
                    ToolbarItem(id: "edit") {
                        Button("Edit") {
                            withAnimation {
                                isEditMode = true
                                selectedClasses.removeAll()
                            }
                        }
                        .font(.system(size: 15))
                        .foregroundColor(colorScheme == .dark ? .white : .black)
                    }

                } else {
                    // Edit mode: single "Done" capsule
                    ToolbarItem(id: "done") {
                        Button("Done") {
                            withAnimation {
                                isEditMode = false
                                selectedClasses.removeAll()
                            }
                        }
                        .font(.system(size: 15))
                        .foregroundColor(colorScheme == .dark ? .white : .black)
                    }
                }
            }
          
            // Bottom toolbar items
            if isEditMode && !selectedClasses.isEmpty {
                ToolbarItem(placement: .bottomBar) {
                    Button(action: deleteSelectedClasses) {
                        Label("Delete", systemImage: "trash")
                    }
                    .tint(.red)
                }

                ToolbarItem(placement: .bottomBar) {
                    Spacer()
                }

                if selectedClasses.count == 1 {
                    ToolbarItem(placement: .bottomBar) {
                        Button(action: {
                            if let classId = selectedClasses.first,
                               let userClass = classManager.classes.first(where: { $0.id == classId }) {
                                editingClass = userClass
                            }
                        }) {
                            Label("Edit", systemImage: "pencil")
                        }
                    }
                }
            }
        }
        .toolbarBackground(.visible, for: .bottomBar)
        .toolbar(isEditMode ? .hidden : .visible, for: .tabBar)
        .sheet(isPresented: $showingCreateClass) {
            CreateClassView()
        }
        .sheet(item: $editingClass) { userClass in
            EditClassView(classToEdit: userClass)
        }
    }

    private var filteredClasses: [UserClass] {
        if searchText.isEmpty {
            return classManager.classes
        } else {
            return classManager.classes.filter { userClass in
                userClass.name.localizedCaseInsensitiveContains(searchText) ||
                userClass.domainType.displayName.localizedCaseInsensitiveContains(searchText)
            }
        }
    }

    private func deleteSelectedClasses() {
        for classId in selectedClasses {
            Task {
                await classManager.deleteClass(classId)
            }
        }
        selectedClasses.removeAll()
        isEditMode = false
    }
}

struct ClassRow: View {
    let userClass: UserClass
    let isEditMode: Bool
    let isSelected: Bool
    let onSelect: () -> Void
    let onEdit: () -> Void
    @EnvironmentObject var classManager: ClassManager
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

            // Domain Icon
            ZStack {
                Circle()
                    .fill(Color(red: 0.61, green: 0.42, blue: 1.0).opacity(0.2))
                    .frame(width: 48, height: 48)

                Image(systemName: userClass.domainType.icon)
                    .font(.system(size: 20))
                    .foregroundColor(Color(red: 0.61, green: 0.42, blue: 1.0))
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(userClass.name)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(colorScheme == .dark ? .white : .black)

                Text(userClass.domainType.displayName)
                    .font(.system(size: 13))
                    .foregroundColor(colorScheme == .dark ? .white.opacity(0.6) : .black.opacity(0.5))
            }

            Spacer()

            if !isEditMode {
                if classManager.activeClass?.id == userClass.id {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 20))
                        .foregroundColor(.green)
                }

                Image(systemName: "chevron.right")
                    .font(.system(size: 14))
                    .foregroundColor(colorScheme == .dark ? .white.opacity(0.4) : .black.opacity(0.3))
            }
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 16)
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
            } else {
                onEdit()
            }
        }
    }
}

// MARK: - Empty State

struct EmptyClassesState: View {
    @Environment(\.colorScheme) var colorScheme

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "folder.badge.plus")
                .font(.system(size: 48))
                .foregroundColor(colorScheme == .dark ? .white.opacity(0.3) : .black.opacity(0.25))

            Text("No classes yet")
                .font(.system(size: 18, weight: .medium))
                .foregroundColor(colorScheme == .dark ? .white.opacity(0.6) : .black.opacity(0.5))

            Text("Tap + to create your first class")
                .font(.system(size: 14))
                .foregroundColor(colorScheme == .dark ? .white.opacity(0.4) : .black.opacity(0.35))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 120)
    }
}

#Preview {
    ManageClassesView()
        .environmentObject(ClassManager.shared)
}
