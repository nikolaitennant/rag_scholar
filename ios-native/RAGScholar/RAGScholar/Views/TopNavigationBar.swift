//
//  TopNavigationBar.swift
//  RAGScholar
//
//  Persistent top navigation bar with class switcher, search, and settings
//

import SwiftUI

struct TopNavigationBar: View {
    @EnvironmentObject var classManager: ClassManager
    @EnvironmentObject var navigationManager: NavigationManager
    @Environment(\.colorScheme) var colorScheme
    @State private var isSearchActive = false
    @State private var searchText = ""
    @State private var showSettings = false
    @FocusState private var isSearchFocused: Bool

    var body: some View {
        HStack(spacing: 12) {
            if isSearchActive {
                // Search Bar (when active) - pill-like design
                HStack(spacing: 8) {
                    Image(systemName: "magnifyingglass")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(colorScheme == .dark ? .white.opacity(0.6) : .black.opacity(0.5))

                    TextField("Search...", text: $searchText)
                        .textFieldStyle(.plain)
                        .font(.system(size: 17, weight: .regular))
                        .foregroundColor(colorScheme == .dark ? .white : .black)
                        .focused($isSearchFocused)
                        .onSubmit {
                            // Handle search submission
                            performSearch()
                        }
                    
                    if !searchText.isEmpty {
                        Button {
                            searchText = ""
                        } label: {
                            Image(systemName: "xmark.circle.fill")
                                .font(.system(size: 16))
                                .foregroundColor(colorScheme == .dark ? .white.opacity(0.6) : .black.opacity(0.5))
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background(
                    RoundedRectangle(cornerRadius: 20) // More pill-like
                        .fill(colorScheme == .dark ? Color(red: 0.16, green: 0.16, blue: 0.18) : Color(red: 0.95, green: 0.95, blue: 0.97))
                )
                
                // Clean close button - similar to class selector
                Button {
                    withAnimation(.easeInOut(duration: 0.3)) {
                        isSearchActive = false
                        searchText = ""
                        isSearchFocused = false
                    }
                } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 18, weight: .medium))
                        .foregroundColor(colorScheme == .dark ? .white.opacity(0.8) : .black.opacity(0.7))
                        .frame(width: 36, height: 36)
                        .background(
                            RoundedRectangle(cornerRadius: 18) // Pill-like close button
                                .fill(colorScheme == .dark ? Color(red: 0.11, green: 0.11, blue: 0.12) : Color.white)
                                .shadow(color: Color(red: 0.61, green: 0.42, blue: 1.0).opacity(0.3), radius: 4, x: 0, y: 0)
                        )
                }
                .buttonStyle(.plain)
                
            } else {
                // Normal Navigation (when search not active)
                // Class Switcher Button
                Button {
                    withAnimation(.easeInOut(duration: 0.3)) {
                        navigationManager.toggleClassSwitcher()
                    }
                } label: {
                    HStack(spacing: 6) {
                        Text(classManager.activeClass?.name ?? "Select Class")
                            .font(.system(size: 17, weight: .semibold))
                            .foregroundColor(colorScheme == .dark ? .white : .black)
                            .lineLimit(1)

                        Image(systemName: "chevron.down")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(colorScheme == .dark ? .white.opacity(0.7) : .black.opacity(0.6))
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(
                        RoundedRectangle(cornerRadius: 16)
                            .fill(colorScheme == .dark ? Color(red: 0.11, green: 0.11, blue: 0.12) : Color.white)
                            .shadow(color: Color(red: 0.61, green: 0.42, blue: 1.0).opacity(0.4), radius: 6, x: 0, y: 0)
                    )
                }
                .buttonStyle(.plain)

                Spacer()

                // Search Button
                Button {
                    withAnimation(.easeInOut(duration: 0.3)) {
                        isSearchActive = true
                        isSearchFocused = true
                    }
                } label: {
                    Image(systemName: "magnifyingglass")
                        .font(.system(size: 20, weight: .medium))
                        .foregroundColor(colorScheme == .dark ? .white.opacity(0.8) : .black.opacity(0.7))
                        .frame(width: 36, height: 36)
                        .background(
                            (colorScheme == .dark ? Color.white.opacity(0.1) : Color.black.opacity(0.05))
                                .clipShape(Circle())
                        )
                }
                .buttonStyle(.plain)

                // Settings Button
                Button {
                    showSettings = true
                } label: {
                    Image(systemName: "gearshape.fill")
                        .font(.system(size: 20, weight: .medium))
                        .foregroundColor(colorScheme == .dark ? .white.opacity(0.8) : .black.opacity(0.7))
                        .frame(width: 36, height: 36)
                        .background(
                            (colorScheme == .dark ? Color.white.opacity(0.1) : Color.black.opacity(0.05))
                                .clipShape(Circle())
                        )
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 24)
        .padding(.vertical, 12)
        .background(colorScheme == .dark ? Color(red: 0.11, green: 0.11, blue: 0.11) : Color.white)
        .sheet(isPresented: $showSettings) {
            SettingsView()
        }
    }
    
    private func performSearch() {
        // Handle search logic here
        // You can integrate with your search functionality
        // For now, we'll just print the search term
        print("Searching for: \(searchText)")
        
        // You could trigger a search in your document manager or other services
        // For example:
        // documentManager.search(query: searchText)
        // or navigate to a search results view
    }
}

#Preview("Dark Mode") {
    TopNavigationBar()
        .environmentObject(ClassManager.shared)
        .environmentObject(NavigationManager.shared)
        .preferredColorScheme(.dark)
}

#Preview("Light Mode") {
    TopNavigationBar()
        .environmentObject(ClassManager.shared)
        .environmentObject(NavigationManager.shared)
        .preferredColorScheme(.light)
}
