//
//  CreateClassView.swift
//  RAGScholar
//
//  Modern class creation with subject type selection
//

import SwiftUI

struct CreateClassView: View {
    @EnvironmentObject var classManager: ClassManager
    @Environment(\.dismiss) var dismiss
    let onDismiss: (() -> Void)?
    
    @State private var className = ""
    @State private var selectedDomainType: DomainType?
    @State private var currentStep = 1
    @FocusState private var isClassNameFieldFocused: Bool
    
    // Domain type options with icons
    private let domainTypes = DomainType.allCases
    
    init(onDismiss: (() -> Void)? = nil) {
        self.onDismiss = onDismiss
    }

    var body: some View {
        ZStack {
            // Background - dimmed and blocks interaction with underlying views
            Color.black.opacity(0.8)
                .ignoresSafeArea()
                .allowsHitTesting(true) // Ensure it captures all taps
                .onTapGesture {
                    withAnimation(.easeInOut(duration: 0.3)) {
                        onDismiss?()
                    }
                }
            
            VStack {
                Spacer()
                
                TabView(selection: $currentStep) {
                    VStack(spacing: 24) {
                        VStack(spacing: 24) {
                            // Step 1: Class Name and Subject Selection
                            VStack(spacing: 8) {
                                Text("Create New Class")
                                    .font(.system(size: 20, weight: .semibold))
                                    .foregroundColor(.white)
                                
                                Text("Choose a name and subject type")
                                    .font(.system(size: 14, weight: .regular))
                                    .foregroundColor(.white.opacity(0.7))
                            }
                            
                            // Class Name Input
                            VStack(alignment: .leading, spacing: 8) {
                                TextField("Class name (e.g., History 101)", text: $className)
                                    .textFieldStyle(.plain)
                                    .font(.system(size: 16, weight: .regular))
                                    .foregroundColor(.white)
                                    .tint(Color(red: 0.64, green: 0.47, blue: 1.0)) // Violet cursor
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
                                                    .fill(Color(red: 0.11, green: 0.11, blue: 0.12))
                                                    .shadow(color: Color(red: 0.61, green: 0.42, blue: 1.0).opacity(0.6), radius: 10, x: 0, y: 0)
                                            } else {
                                                Capsule()
                                                    .fill(Color(red: 0.11, green: 0.11, blue: 0.12))
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
                                    if !className.isEmpty && selectedDomainType != nil {
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
                                            Capsule() // Perfect pill shape for Next button
                                                .fill(
                                                    (!className.isEmpty && selectedDomainType != nil) ?
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
                                                .shadow(color: (!className.isEmpty && selectedDomainType != nil) ? Color(red: 0.61, green: 0.42, blue: 1.0).opacity(0.4) : Color.clear, radius: 8, x: 0, y: 0) // Glow effect
                                        )
                                }
                                .buttonStyle(.plain)
                                .disabled(className.isEmpty || selectedDomainType == nil)
                                
                                Button {
                                    withAnimation(.easeInOut(duration: 0.3)) {
                                        onDismiss?()
                                    }
                                } label: {
                                    Text("Cancel")
                                        .font(.system(size: 16, weight: .medium))
                                        .foregroundColor(.white.opacity(0.7))
                                        .frame(width: 80)
                                        .padding(.vertical, 14)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding(24)
                        .background(
                            RoundedRectangle(cornerRadius: 28) // More rounded
                                .fill(Color(red: 0.11, green: 0.11, blue: 0.12))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 28)
                                        .stroke(Color.white.opacity(0.1), lineWidth: 1) // Subtle grey highlight
                                )
                        )
                        .padding(.horizontal, 20)
                    }
                    .tag(1)
                    
                    VStack(spacing: 24) {
                        VStack(spacing: 24) {
                            // Step 2: Document Upload (placeholder)
                            VStack(spacing: 8) {
                                Text("Add Documents")
                                    .font(.system(size: 20, weight: .semibold))
                                    .foregroundColor(.white)
                                
                                Text("Upload or select documents for your class")
                                    .font(.system(size: 14, weight: .regular))
                                    .foregroundColor(.white.opacity(0.7))
                            }
                            
                            // Upload Button - transparent purple with outline and glow
                            Button {
                                // Handle document upload
                            } label: {
                                HStack(spacing: 12) {
                                    Image(systemName: "plus")
                                        .font(.system(size: 16, weight: .medium))
                                    Text("Upload Document")
                                        .font(.system(size: 16, weight: .medium))
                                }
                                .foregroundColor(Color(red: 0.7, green: 0.55, blue: 0.95)) // Slightly lighter purple text
                                .padding(.horizontal, 24) // Better padding
                                .padding(.vertical, 14)
                                .background(
                                    Capsule() // Perfect pill shape
                                        .fill(Color(red: 0.55, green: 0.35, blue: 0.9).opacity(0.15)) // Slightly darker purple fill
                                        .overlay(
                                            Capsule()
                                                .stroke(Color(red: 0.55, green: 0.35, blue: 0.9).opacity(0.7), lineWidth: 1.5) // Darker purple outline
                                        )
                                        .shadow(color: Color(red: 0.55, green: 0.35, blue: 0.9).opacity(0.4), radius: 8, x: 0, y: 2) // Glow effect
                                )
                            }
                            .buttonStyle(.plain)
                            
                            // Existing Documents Section
                            VStack(alignment: .leading, spacing: 12) {
                                Text("Existing Documents")
                                    .font(.system(size: 16, weight: .medium))
                                    .foregroundColor(.white)
                                
                                // Sample documents (replace with actual document list)
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
                                        .foregroundColor(.white.opacity(0.7))
                                        .frame(width: 80)
                                        .padding(.vertical, 14)
                                }
                                .buttonStyle(.plain)
                                
                                Button {
                                    createClass()
                                } label: {
                                    Text("Create")
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
                                                .shadow(color: Color(red: 0.5, green: 0.5, blue: 1.0).opacity(0.8), radius: 12, x: 0, y: 4) // Stronger gradient glow
                                                .shadow(color: Color(red: 0.6, green: 0.4, blue: 1.0).opacity(0.6), radius: 20, x: 0, y: 8) // Additional outer glow
                                        )
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding(24)
                        .background(
                            RoundedRectangle(cornerRadius: 28) // More rounded
                                .fill(Color(red: 0.11, green: 0.11, blue: 0.12))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 28)
                                        .stroke(Color.white.opacity(0.1), lineWidth: 1) // Subtle grey highlight
                                )
                        )
                        .padding(.horizontal, 20)
                    }
                    .tag(2)
                }
                .tabViewStyle(.page)
//                .indexViewStyle(.never)  // This line was removed as per instructions
                
                Spacer()
            }
            .zIndex(1) // Ensure content stays above background
        }
        .zIndex(2000) // Very high zIndex to ensure it stays above ClassSwitcher
    }
    
    private func createClass() {
        guard let domainType = selectedDomainType else { return }
        Task {
            await classManager.createClass(name: className, domainType: domainType, description: nil)
            await MainActor.run {
                withAnimation(.easeInOut(duration: 0.3)) {
                    onDismiss?()
                }
            }
        }
    }
}

// MARK: - Domain Type Button

struct DomainTypeButton: View {
    let domainType: DomainType
    let isSelected: Bool
    let onSelect: () -> Void
    
    var body: some View {
        Button(action: onSelect) {
            VStack(spacing: 8) {
                Image(systemName: domainType.icon)
                    .font(.system(size: 24, weight: .medium))
                    .foregroundColor(isSelected ? Color(red: 0.61, green: 0.42, blue: 1.0) : .white.opacity(0.7))
                
                Text(domainType.displayName)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.white.opacity(0.8))
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(isSelected ? Color(red: 0.61, green: 0.42, blue: 1.0).opacity(0.2) : Color(red: 0.16, green: 0.16, blue: 0.18))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(isSelected ? Color(red: 0.61, green: 0.42, blue: 1.0) : Color.clear, lineWidth: 1)
                    )
            )
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Document Row View

struct DocumentRowView: View {
    let name: String
    let type: String
    
    var body: some View {
        HStack(spacing: 12) {
            // Only highlight the icon, not the whole row
            Image(systemName: "doc.text")
                .font(.system(size: 20))
                .foregroundColor(Color(red: 0.64, green: 0.47, blue: 1.0)) // Highlighted icon
                .frame(width: 24, height: 24)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(name)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(.white)
                
                Text(type)
                    .font(.system(size: 12, weight: .regular))
                    .foregroundColor(.white.opacity(0.6))
            }
            
            Spacer()
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        // Removed background highlight - only icon is highlighted now
    }
}

#Preview {
    CreateClassView()
        .environmentObject(ClassManager.shared)
}

