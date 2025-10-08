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
    @EnvironmentObject var chatManager: ChatManager
    @Environment(\.colorScheme) var colorScheme
    @State private var showSettings = false
    @State private var showClassPicker = false

    var body: some View {
        HStack(spacing: 12) {
            // Class Dropdown (Traditional Menu) - Only on Chat tab
            if navigationManager.selectedTab == .chat {
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
            } else {
                // Class Switcher Button for non-Chat tabs
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
            }

            Spacer()

            // Show New Chat button only on Chat tab
            if navigationManager.selectedTab == .chat {
                Button {
                    startNewChat()
                } label: {
                    Image(systemName: "square.and.pencil")
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

            // Settings Button (only on Home tab)
            if navigationManager.selectedTab == .home {
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

    private func startNewChat() {
        // Clear current session to start a new chat
        Task {
            await chatManager.startNewSession()
            HapticManager.shared.impact(.medium)
        }
    }
}

#Preview("Dark Mode") {
    TopNavigationBar()
        .environmentObject(ClassManager.shared)
        .environmentObject(NavigationManager.shared)
        .environmentObject(ChatManager.shared)
        .preferredColorScheme(.dark)
}

#Preview("Light Mode") {
    TopNavigationBar()
        .environmentObject(ClassManager.shared)
        .environmentObject(NavigationManager.shared)
        .environmentObject(ChatManager.shared)
        .preferredColorScheme(.light)
}
