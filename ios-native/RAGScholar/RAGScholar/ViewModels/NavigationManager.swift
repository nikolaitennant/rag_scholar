//
//  NavigationManager.swift
//  RAGScholar
//
//  Manages app navigation state
//

import Foundation
import Combine
internal import UIKit

@MainActor
class NavigationManager: ObservableObject {
    static let shared = NavigationManager()

    @Published var selectedTab: Tab = .home
    @Published var showClassSwitcher = false
    @Published var showGlobalSearch = false

    private init() {}

    enum Tab: String, CaseIterable {
        case home = "Home"
        case chat = "Chat"
        case docs = "Docs"
        case rewards = "Rewards"

        var icon: String {
            switch self {
            case .home: return "house.fill"
            case .chat: return "message.fill"
            case .docs: return "doc.fill"
            case .rewards: return "star.fill"
            }
        }
    }

    func selectTab(_ tab: Tab) {
        selectedTab = tab
        HapticManager.shared.selectionFeedback()
    }

    func toggleClassSwitcher() {
        showClassSwitcher.toggle()
        if showClassSwitcher {
            HapticManager.shared.impact(.light)
        }
    }

    func toggleGlobalSearch() {
        showGlobalSearch.toggle()
        if showGlobalSearch {
            HapticManager.shared.impact(.light)
        }
    }
}
