//
//  ChangeDomainView.swift
//  RAGScholar
//
//  Change domain type for a class
//

import SwiftUI

struct ChangeDomainView: View {
    @EnvironmentObject var classManager: ClassManager
    @Environment(\.dismiss) var dismiss
    @Environment(\.colorScheme) var colorScheme
    let onDismiss: (() -> Void)?
    let classItem: UserClass

    @State private var selectedDomainType: DomainType

    private let domainTypes = DomainType.allCases

    init(classItem: UserClass, onDismiss: (() -> Void)? = nil) {
        self.classItem = classItem
        self.onDismiss = onDismiss
        _selectedDomainType = State(initialValue: classItem.domainType)
    }

    var body: some View {
        ZStack {
            // Background to ensure proper color scheme detection
            (colorScheme == .dark ? Color.black : Color.white)
                .opacity(0.001)
                .ignoresSafeArea()

            VStack {
                Spacer()

                VStack(spacing: 24) {
                VStack(spacing: 24) {
                    // Header
                    VStack(spacing: 8) {
                        Text("Change Domain")
                            .font(.system(size: 20, weight: .semibold))
                            .foregroundColor(colorScheme == .dark ? .white : .black)

                        Text("Update subject type for \(classItem.name)")
                            .font(.system(size: 14, weight: .regular))
                            .foregroundColor(colorScheme == .dark ? .white.opacity(0.7) : .black.opacity(0.6))
                            .multilineTextAlignment(.center)
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
                                                    Color(red: 0.61, green: 0.42, blue: 1.0),
                                                    Color(red: 0.64, green: 0.47, blue: 1.0)
                                                ],
                                                startPoint: .leading,
                                                endPoint: .trailing
                                            )
                                        )
                                        .shadow(color: Color(red: 0.61, green: 0.42, blue: 1.0).opacity(0.4), radius: 8, x: 0, y: 0)
                                )
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(24)
                .background(
                    RoundedRectangle(cornerRadius: 28)
                        .fill(colorScheme == .dark ? Color(red: 0.11, green: 0.11, blue: 0.12) : Color.white)
                        .overlay(
                            RoundedRectangle(cornerRadius: 28)
                                .stroke(colorScheme == .dark ? Color.white.opacity(0.1) : Color.black.opacity(0.1), lineWidth: 1)
                        )
                        .shadow(color: colorScheme == .dark ? Color.clear : Color.black.opacity(0.1), radius: 20, x: 0, y: 10)
                )
                .padding(.horizontal, 20)
            }

                Spacer()
            }
        }
    }

    private func saveChanges() {
        Task {
            await classManager.updateClass(
                classItem.id,
                name: classItem.name,
                domainType: selectedDomainType,
                description: classItem.description
            )
            await MainActor.run {
                withAnimation(.easeInOut(duration: 0.3)) {
                    onDismiss?()
                }
            }
        }
    }
}

#Preview("Dark Mode") {
    ChangeDomainView(
        classItem: UserClass(
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
    ChangeDomainView(
        classItem: UserClass(
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
