//
//  NavigationManager.swift
//  RAGScholar
//
//  Manages app navigation state
//

import Foundation
import Combine
import UIKit

@MainActor
class NavigationManager: ObservableObject {
    static let shared = NavigationManager()

    @Published var selectedTab: Tab = .home
    @Published var showGlobalSearch = false
    @Published var showChat = false
    @Published var previousTab: Tab = .home

    private init() {}

    enum Tab: String, CaseIterable {
        case home = "Home"
        case docs = "Docs"
        case classes = "Classes"
        case chat = "Chat"

        var icon: String {
            switch self {
            case .home: return "house.fill"
            case .docs: return "doc.fill"
            case .classes: return "folder.fill"
            case .chat: return "message.fill"
            }
        }
    }

    func selectTab(_ tab: Tab) {
        // Save previous tab before switching
        if selectedTab != .chat {
            previousTab = selectedTab
        }
        selectedTab = tab

        // If selecting chat tab, show it as overlay
        if tab == .chat {
            showChat = true
        }

        HapticManager.shared.selectionFeedback()
    }

    func toggleGlobalSearch() {
        showGlobalSearch.toggle()
        if showGlobalSearch {
            HapticManager.shared.impact(.light)
        }
    }

    func openChat() {
        if selectedTab != .chat {
            previousTab = selectedTab
        }
        showChat = true
        selectedTab = .chat
        HapticManager.shared.impact(.light)
    }

    func closeChat() {
        showChat = false
        // Return to previous tab
        selectedTab = previousTab
        HapticManager.shared.impact(.light)
    }
}
