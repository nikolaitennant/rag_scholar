//
//  ClassSwitcherView.swift
//  RAGScholar
//
//  Modern card-based class switcher with subject type selection
//

import SwiftUI

struct ClassSwitcherView: View {
    @EnvironmentObject var classManager: ClassManager
    @EnvironmentObject var navigationManager: NavigationManager
    @Environment(\.dismiss) var dismiss
    @Environment(\.colorScheme) var colorScheme
    let onDismiss: (() -> Void)?
    let onCreateClass: (() -> Void)?
    let onEditClass: ((UserClass) -> Void)?
    let onManageDocuments: ((UserClass) -> Void)?
    let onChangeDomain: ((UserClass) -> Void)?

    @State private var showingCreateClass = false

    init(onDismiss: (() -> Void)? = nil, onCreateClass: (() -> Void)? = nil, onEditClass: ((UserClass) -> Void)? = nil, onManageDocuments: ((UserClass) -> Void)? = nil, onChangeDomain: ((UserClass) -> Void)? = nil) {
        self.onDismiss = onDismiss
        self.onCreateClass = onCreateClass
        self.onEditClass = onEditClass
        self.onManageDocuments = onManageDocuments
        self.onChangeDomain = onChangeDomain
    }

    private var cardBackground: Color {
        colorScheme == .dark ? Color(red: 0.11, green: 0.11, blue: 0.12) : Color.white
    }

    private var cardBorder: Color {
        colorScheme == .dark ? Color.white.opacity(0.1) : Color.black.opacity(0.1)
    }

    private var cardShadow: Color {
        colorScheme == .dark ? Color.clear : Color.black.opacity(0.1)
    }

    var body: some View {
        ZStack {
            // Background to ensure proper color scheme detection
            (colorScheme == .dark ? Color.black : Color.white)
                .opacity(0.001)
                .ignoresSafeArea()

            VStack(spacing: 20) {
                Spacer()

            // Class Switcher Card
            VStack(spacing: 24) {
                // Header
                VStack(spacing: 8) {
                    Text("Select Class")
                        .font(.system(size: 20, weight: .semibold))
                        .foregroundColor(colorScheme == .dark ? .white : .black)

                    Text("Choose your active class")
                        .font(.system(size: 14, weight: .regular))
                        .foregroundColor(colorScheme == .dark ? Color.white.opacity(0.7) : Color.black.opacity(0.6))
                }
                
                // Classes List - Scrollable with fixed height
                ScrollView {
                    if classManager.classes.isEmpty {
                        // Empty state
                        VStack(spacing: 16) {
                            Image(systemName: "book.closed")
                                .font(.system(size: 32))
                                .foregroundColor(colorScheme == .dark ? Color.white.opacity(0.4) : Color.black.opacity(0.3))

                            Text("No classes yet")
                                .font(.system(size: 16, weight: .medium))
                                .foregroundColor(colorScheme == .dark ? Color.white.opacity(0.7) : Color.black.opacity(0.6))
                        }
                        .padding(.vertical, 40)
                        .frame(maxWidth: .infinity)
                    } else {
                        // Class list
                        LazyVStack(spacing: 12) {
                            ForEach(classManager.classes) { classItem in
                                ClassRowView(
                                    classItem: classItem,
                                    isSelected: classManager.activeClass?.id == classItem.id,
                                    onSelect: {
                                        classManager.selectClass(classItem)
                                        onDismiss?() ?? dismiss()
                                    },
                                    onManageDocuments: {
                                        onManageDocuments?(classItem)
                                    },
                                    onChangeDomain: {
                                        onChangeDomain?(classItem)
                                    }
                                )
                            }
                        }
                        .padding(.vertical, 8)
                    }
                }
                .frame(height: 300)
                .scrollIndicators(.hidden)
                
                // Action Buttons
                HStack(spacing: 12) {
                    // Create New Class Button - pill shaped
                    Button {
                        onCreateClass?()
                    } label: {
                        Text("Create New Class")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(
                                Capsule() // Perfect pill shape
                                    .fill(
                                        LinearGradient(
                                            colors: [
                                                Color(red: 0.3, green: 0.6, blue: 1.0),
                                                Color(red: 0.6, green: 0.4, blue: 1.0)
                                            ],
                                            startPoint: .leading,
                                            endPoint: .trailing
                                        )
                                    )
                                    .shadow(color: Color(red: 0.5, green: 0.5, blue: 1.0).opacity(0.4), radius: 8, x: 0, y: 2) // Glow effect
                            )
                    }
                    .buttonStyle(.plain)
                    
                    // Cancel Button
                    Button {
                        onDismiss?() ?? dismiss()
                    } label: {
                        Text("Cancel")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(colorScheme == .dark ? .white.opacity(0.7) : .black.opacity(0.6))
                            .frame(width: 80)
                            .padding(.vertical, 14)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(24)
            .background(
                RoundedRectangle(cornerRadius: 28)
                    .fill(cardBackground)
                    .overlay(
                        RoundedRectangle(cornerRadius: 28)
                            .stroke(cardBorder, lineWidth: 1)
                    )
                    .shadow(color: cardShadow, radius: 20, x: 0, y: 10)
            )
            .padding(.horizontal, 12)

                Spacer()
            }
        }
    }

    // Computed property to help with type checking
    private var createButtonGradient: LinearGradient {
        LinearGradient(
            colors: [
                Color(red: 0.3, green: 0.6, blue: 1.0),
                Color(red: 0.6, green: 0.4, blue: 1.0)
            ],
            startPoint: .leading,
            endPoint: .trailing
        )
    }
}

// MARK: - Class Row View

struct ClassRowView: View {
    @EnvironmentObject var classManager: ClassManager
    @Environment(\.colorScheme) var colorScheme
    let classItem: UserClass
    let isSelected: Bool
    let onSelect: () -> Void
    let onManageDocuments: (() -> Void)?
    let onChangeDomain: (() -> Void)?

    @State private var showRenameAlert = false
    @State private var showDeleteConfirmation = false
    @State private var newName = ""

    var body: some View {
        Button(action: onSelect) {
            HStack(spacing: 12) {
                // Subject Icon
                Image(systemName: classItem.domainType.icon)
                    .font(.system(size: 20, weight: .medium))
                    .foregroundColor(colorScheme == .dark ? Color.white.opacity(0.8) : Color.black.opacity(0.7))
                    .frame(width: 32, height: 32)

                VStack(alignment: .leading, spacing: 2) {
                    Text(classItem.name)
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(colorScheme == .dark ? .white : .black)
                        .multilineTextAlignment(.leading)

                    Text(classItem.domainType.displayName)
                        .font(.system(size: 13, weight: .regular))
                        .foregroundColor(colorScheme == .dark ? Color.white.opacity(0.6) : Color.black.opacity(0.5))
                }

                Spacer()

                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 20))
                        .foregroundColor(Color(red: 0.61, green: 0.42, blue: 1.0))
                }
            }
        }
        .buttonStyle(.plain)
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .contentShape(RoundedRectangle(cornerRadius: 12))
        .contextMenu {
            Button {
                newName = classItem.name
                showRenameAlert = true
            } label: {
                Label("Rename", systemImage: "pencil")
            }

            Button {
                onChangeDomain?()
            } label: {
                Label("Change Domain", systemImage: "book.fill")
            }

            Button {
                onManageDocuments?()
            } label: {
                Label("Manage Documents", systemImage: "doc.fill")
            }

            Divider()

            Button(role: .destructive) {
                showDeleteConfirmation = true
            } label: {
                Label("Delete", systemImage: "trash")
            }
        }
        .alert("Rename Class", isPresented: $showRenameAlert) {
            TextField("Class name", text: $newName)
            Button("Cancel", role: .cancel) { }
            Button("Rename") {
                renameClass()
            }
        }
        .alert("Delete Class", isPresented: $showDeleteConfirmation) {
            Button("Cancel", role: .cancel) { }
            Button("Delete", role: .destructive) {
                deleteClass()
            }
        } message: {
            Text("Are you sure you want to delete \(classItem.name)? This action cannot be undone.")
        }
    }

    private func renameClass() {
        guard !newName.isEmpty else { return }
        Task {
            await classManager.updateClass(
                classItem.id,
                name: newName,
                domainType: classItem.domainType,
                description: classItem.description
            )
        }
    }

    private func deleteClass() {
        Task {
            await classManager.deleteClass(classItem.id)
        }
    }
}

#Preview("Dark Mode") {
    ClassSwitcherView()
        .environmentObject(ClassManager.shared)
        .environmentObject(NavigationManager.shared)
        .preferredColorScheme(.dark)
}

#Preview("Light Mode") {
    ClassSwitcherView()
        .environmentObject(ClassManager.shared)
        .environmentObject(NavigationManager.shared)
        .preferredColorScheme(.light)
}
