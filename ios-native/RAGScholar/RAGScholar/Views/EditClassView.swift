//
//  EditClassView.swift
//  RAGScholar
//
//  Edit existing class with name, subject type, and documents
//

import SwiftUI

struct EditClassView: View {
    @EnvironmentObject var classManager: ClassManager
    @Environment(\.dismiss) var dismiss
    @Environment(\.colorScheme) var colorScheme
    let onDismiss: (() -> Void)?
    let classToEdit: UserClass

    @State private var className: String
    @State private var selectedDomainType: DomainType
    @State private var currentStep = 1
    @FocusState private var isClassNameFieldFocused: Bool
    @State private var showDeleteConfirmation = false

    private let domainTypes = DomainType.allCases

    init(classToEdit: UserClass, onDismiss: (() -> Void)? = nil) {
        self.classToEdit = classToEdit
        self.onDismiss = onDismiss
        _className = State(initialValue: classToEdit.name)
        _selectedDomainType = State(initialValue: classToEdit.domainType)
    }

    private var inputBackgroundColor: Color {
        colorScheme == .dark ? Color(red: 0.11, green: 0.11, blue: 0.12) : Color.white
    }

    private var cardBackgroundColor: Color {
        colorScheme == .dark ? Color(red: 0.11, green: 0.11, blue: 0.12) : Color.white
    }

    private var borderColor: Color {
        colorScheme == .dark ? Color.white.opacity(0.1) : Color.black.opacity(0.1)
    }

    private var shadowColor: Color {
        colorScheme == .dark ? Color.clear : Color.black.opacity(0.1)
    }

    var body: some View {
        ZStack {
            // Background to ensure proper color scheme detection
            (colorScheme == .dark ? Color.black : Color.white)
                .opacity(0.001)
                .ignoresSafeArea()

            VStack {
                Spacer()

                TabView(selection: $currentStep) {
                    step1Content.tag(1)
                    step2Content.tag(2)
                }
                .tabViewStyle(.page)

            // Floating delete button below modal
            VStack(spacing: 6) {
                Button(role: .destructive) {
                    showDeleteConfirmation = true
                } label: {
                    Image(systemName: "trash.fill")
                        .font(.system(size: 18, weight: .medium))
                        .foregroundColor(.white)
                        .frame(width: 50, height: 50)
                        .background(
                            Circle()
                                .fill(Color.red)
                        )
                }
                .buttonStyle(.plain)

                Text("Delete")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.gray)
                    .padding(.horizontal, 8)
            }
            .padding(.top, 12)

                Spacer()
            }
        }
        .alert("Delete Class", isPresented: $showDeleteConfirmation) {
            Button("Cancel", role: .cancel) { }
            Button("Delete", role: .destructive) {
                deleteClass()
            }
        } message: {
            Text("Are you sure you want to delete \(classToEdit.name)? This action cannot be undone.")
        }
    }

    private var step1Content: some View {
        VStack(spacing: 24) {
            VStack(spacing: 24) {
                // Header
                VStack(spacing: 8) {
                    Text("Edit Class")
                        .font(.system(size: 20, weight: .semibold))
                        .foregroundColor(colorScheme == .dark ? .white : .black)

                    Text("Update name and subject type")
                        .font(.system(size: 14, weight: .regular))
                        .foregroundColor(colorScheme == .dark ? .white.opacity(0.7) : .black.opacity(0.6))
                }

                // Class Name Input
                VStack(alignment: .leading, spacing: 8) {
                    TextField("Class name", text: $className)
                        .textFieldStyle(.plain)
                        .font(.system(size: 16, weight: .regular))
                        .foregroundColor(colorScheme == .dark ? .white : .black)
                        .tint(Color(red: 0.64, green: 0.47, blue: 1.0))
                        .focused($isClassNameFieldFocused)
                        .onTapGesture {
                            isClassNameFieldFocused = true
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 14)
                        .background(
                            Group {
                                if isClassNameFieldFocused {
                                    Capsule()
                                        .fill(inputBackgroundColor)
                                        .shadow(color: Color(red: 0.61, green: 0.42, blue: 1.0).opacity(0.6), radius: 10, x: 0, y: 0)
                                } else {
                                    Capsule()
                                        .fill(inputBackgroundColor)
                                        .overlay(
                                            Capsule()
                                                .stroke(colorScheme == .dark ? Color.white.opacity(0.2) : Color.black.opacity(0.1), lineWidth: 1)
                                        )
                                }
                            }
                        )
                }

                // Domain Type Selection Grid
                LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 12), count: 3), spacing: 12) {
                    ForEach(domainTypes, id: \.self) { domainType in
                        DomainTypeButton(
                            domainType: domainType,
                            isSelected: selectedDomainType == domainType,
                            onSelect: {
                                selectedDomainType = domainType
                            }
                        )
                    }
                }

                // Action Buttons
                HStack(spacing: 12) {
                    Button {
                        if !className.isEmpty {
                            withAnimation(.easeInOut(duration: 0.4)) {
                                currentStep = 2
                            }
                        }
                    } label: {
                        Text("Next")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(
                                Capsule()
                                    .fill(
                                        !className.isEmpty ?
                                        LinearGradient(
                                            colors: [
                                                Color(red: 0.61, green: 0.42, blue: 1.0),
                                                Color(red: 0.64, green: 0.47, blue: 1.0)
                                            ],
                                            startPoint: .leading,
                                            endPoint: .trailing
                                        ) :
                                        LinearGradient(
                                            colors: [Color.gray.opacity(0.3), Color.gray.opacity(0.3)],
                                            startPoint: .leading,
                                            endPoint: .trailing
                                        )
                                    )
                                    .shadow(color: !className.isEmpty ? Color(red: 0.61, green: 0.42, blue: 1.0).opacity(0.4) : Color.clear, radius: 8, x: 0, y: 0)
                            )
                    }
                    .buttonStyle(.plain)
                    .disabled(className.isEmpty)

                    Button {
                        withAnimation(.easeInOut(duration: 0.3)) {
                            onDismiss?()
                        }
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
                    .fill(cardBackgroundColor)
                    .overlay(
                        RoundedRectangle(cornerRadius: 28)
                            .stroke(borderColor, lineWidth: 1)
                    )
                    .shadow(color: shadowColor, radius: 20, x: 0, y: 10)
            )
            .padding(.horizontal, 20)
        }
    }

    private var step2Content: some View {
        VStack(spacing: 24) {
            VStack(spacing: 24) {
                // Header
                VStack(spacing: 8) {
                    Text("Manage Documents")
                        .font(.system(size: 20, weight: .semibold))
                        .foregroundColor(colorScheme == .dark ? .white : .black)

                    Text("Upload or manage documents for your class")
                        .font(.system(size: 14, weight: .regular))
                        .foregroundColor(colorScheme == .dark ? .white.opacity(0.7) : .black.opacity(0.6))
                }

                // Upload Button
                Button {
                    // Handle document upload
                } label: {
                    HStack(spacing: 12) {
                        Image(systemName: "plus")
                            .font(.system(size: 16, weight: .medium))
                        Text("Upload Document")
                            .font(.system(size: 16, weight: .medium))
                    }
                    .foregroundColor(Color(red: 0.7, green: 0.55, blue: 0.95))
                    .padding(.horizontal, 24)
                    .padding(.vertical, 14)
                    .background(
                        Capsule()
                            .fill(Color(red: 0.55, green: 0.35, blue: 0.9).opacity(0.15))
                            .overlay(
                                Capsule()
                                    .stroke(Color(red: 0.55, green: 0.35, blue: 0.9).opacity(0.7), lineWidth: 1.5)
                            )
                            .shadow(color: Color(red: 0.55, green: 0.35, blue: 0.9).opacity(0.4), radius: 8, x: 0, y: 2)
                    )
                }
                .buttonStyle(.plain)

                // Existing Documents Section
                VStack(alignment: .leading, spacing: 12) {
                    Text("Existing Documents")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(colorScheme == .dark ? .white : .black)

                    VStack(spacing: 8) {
                        DocumentRowView(name: "Sample Document.pdf", type: "Document")
                        DocumentRowView(name: "Lecture Notes.md", type: "Document")
                    }
                }
                .padding(.top, 16)

                // Final Action Buttons
                HStack(spacing: 12) {
                    Button {
                        withAnimation(.easeInOut(duration: 0.4)) {
                            currentStep = 1
                        }
                    } label: {
                        Text("Back")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(colorScheme == .dark ? .white.opacity(0.7) : .black.opacity(0.6))
                            .frame(width: 80)
                            .padding(.vertical, 14)
                    }
                    .buttonStyle(.plain)

                    Button {
                        saveChanges()
                    } label: {
                        Text("Save")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(
                                Capsule()
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
                                    .shadow(color: Color(red: 0.5, green: 0.5, blue: 1.0).opacity(0.8), radius: 12, x: 0, y: 4)
                                    .shadow(color: Color(red: 0.6, green: 0.4, blue: 1.0).opacity(0.6), radius: 20, x: 0, y: 8)
                            )
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(24)
            .background(
                RoundedRectangle(cornerRadius: 28)
                    .fill(cardBackgroundColor)
                    .overlay(
                        RoundedRectangle(cornerRadius: 28)
                            .stroke(borderColor, lineWidth: 1)
                    )
                    .shadow(color: shadowColor, radius: 20, x: 0, y: 10)
            )
            .padding(.horizontal, 20)
        }
    }

    private func saveChanges() {
        Task {
            await classManager.updateClass(
                classToEdit.id,
                name: className,
                domainType: selectedDomainType,
                description: classToEdit.description
            )
            await MainActor.run {
                withAnimation(.easeInOut(duration: 0.3)) {
                    onDismiss?()
                }
            }
        }
    }

    private func deleteClass() {
        Task {
            await classManager.deleteClass(classToEdit.id)
            await MainActor.run {
                withAnimation(.easeInOut(duration: 0.3)) {
                    onDismiss?()
                }
            }
        }
    }
}

#Preview("Dark Mode") {
    EditClassView(
        classToEdit: UserClass(
            id: "1",
            name: "Test Class",
            domainType: .science,
            description: "Test description",
            documents: [],
            createdAt: "2025-01-01T00:00:00Z",
            updatedAt: "2025-01-01T00:00:00Z"
        )
    )
    .environmentObject(ClassManager.shared)
    .preferredColorScheme(.dark)
}

#Preview("Light Mode") {
    EditClassView(
        classToEdit: UserClass(
            id: "1",
            name: "Test Class",
            domainType: .science,
            description: "Test description",
            documents: [],
            createdAt: "2025-01-01T00:00:00Z",
            updatedAt: "2025-01-01T00:00:00Z"
        )
    )
    .environmentObject(ClassManager.shared)
    .preferredColorScheme(.light)
}
