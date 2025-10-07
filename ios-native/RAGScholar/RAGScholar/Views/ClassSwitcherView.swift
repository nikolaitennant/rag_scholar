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
    let onDismiss: (() -> Void)?
    
    @State private var showingCreateClass = false
    
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
                    onDismiss?() ?? dismiss()
                }
            
            VStack(spacing: 20) {
                Spacer()
                
                // Class Switcher Card
                VStack(spacing: 24) {
                // Header
                VStack(spacing: 8) {
                    Text("Select Class")
                        .font(.system(size: 20, weight: .semibold))
                        .foregroundColor(.white)
                    
                    Text("Choose your active class")
                        .font(.system(size: 14, weight: .regular))
                        .foregroundColor(.white.opacity(0.7))
                }
                    
                    // Classes List
                    if classManager.classes.isEmpty {
                        // Empty state
                        VStack(spacing: 16) {
                            Image(systemName: "book.closed")
                                .font(.system(size: 32))
                                .foregroundColor(.white.opacity(0.4))
                            
                            Text("No classes yet")
                                .font(.system(size: 16, weight: .medium))
                                .foregroundColor(.white.opacity(0.7))
                        }
                        .padding(.vertical, 20)
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
                                    }
                                )
                            }
                        }
                    }
                    
                    // Action Buttons
                    HStack(spacing: 12) {
                        // Create New Class Button - pill shaped
                        Button {
                            showingCreateClass = true
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
                
                Spacer()
            }
            .zIndex(1) // Ensure content stays above background
        }
        .overlay(
            // Create class modal overlay
            Group {
                if showingCreateClass {
                    ZStack {
                        // Dimmed background
                        Color.black.opacity(0.4)
                            .ignoresSafeArea()
                            .onTapGesture {
                                showingCreateClass = false
                            }
                        
                        // Modal content that appears in the center
                        CreateClassView(onDismiss: {
                            showingCreateClass = false
                            // Also dismiss the ClassSwitcherView after creating a class
                            onDismiss?() ?? dismiss()
                        })
                        .transition(AnyTransition.opacity.combined(with: AnyTransition.scale(scale: 0.9)))
                    }
                }
            }
        )
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
    let classItem: UserClass
    let isSelected: Bool
    let onSelect: () -> Void
    
    var body: some View {
        Button(action: onSelect) {
            HStack(spacing: 12) {
                // Subject Icon
                Image(systemName: classItem.domainType.icon)
                    .font(.system(size: 20, weight: .medium))
                    .foregroundColor(.white.opacity(0.8))
                    .frame(width: 32, height: 32)
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(classItem.name)
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(.white)
                        .multilineTextAlignment(.leading)
                    
                    Text(classItem.domainType.displayName)
                        .font(.system(size: 13, weight: .regular))
                        .foregroundColor(.white.opacity(0.6))
                }
                
                Spacer()
                
                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 20))
                        .foregroundColor(Color(red: 0.61, green: 0.42, blue: 1.0))
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(isSelected ? Color.white.opacity(0.08) : Color.clear)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(isSelected ? Color(red: 0.61, green: 0.42, blue: 1.0).opacity(0.3) : Color.clear, lineWidth: 1)
                    )
            )
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    ClassSwitcherView()
        .environmentObject(ClassManager.shared)
        .environmentObject(NavigationManager.shared)
}
