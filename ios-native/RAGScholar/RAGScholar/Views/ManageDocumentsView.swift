//
//  ManageDocumentsView.swift
//  RAGScholar
//
//  Manage documents for a class
//

import SwiftUI

struct ManageDocumentsView: View {
    @EnvironmentObject var classManager: ClassManager
    @Environment(\.dismiss) var dismiss
    @Environment(\.colorScheme) var colorScheme
    let onDismiss: (() -> Void)?
    let classItem: UserClass

    init(classItem: UserClass, onDismiss: (() -> Void)? = nil) {
        self.classItem = classItem
        self.onDismiss = onDismiss
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
                        Text("Manage Documents")
                            .font(.system(size: 20, weight: .semibold))
                            .foregroundColor(colorScheme == .dark ? .white : .black)

                        Text("Upload or manage documents for \(classItem.name)")
                            .font(.system(size: 14, weight: .regular))
                            .foregroundColor(colorScheme == .dark ? .white.opacity(0.7) : .black.opacity(0.6))
                            .multilineTextAlignment(.center)
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

                    // Action Buttons
                    HStack(spacing: 12) {
                        Button {
                            withAnimation(.easeInOut(duration: 0.3)) {
                                onDismiss?()
                            }
                        } label: {
                            Text("Done")
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
}

#Preview("Dark Mode") {
    ManageDocumentsView(
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
    ManageDocumentsView(
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
