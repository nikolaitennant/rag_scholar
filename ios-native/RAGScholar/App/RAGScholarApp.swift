//
//  RAGScholarApp.swift
//  RAGScholar
//
//  Native iOS Application for RAG Scholar
//  Created: 2025
//

import SwiftUI
import Firebase

@main
struct RAGScholarApp: App {
    @StateObject private var authManager = AuthenticationManager.shared
    @StateObject private var classManager = ClassManager.shared
    @StateObject private var navigationManager = NavigationManager.shared

    init() {
        // Configure Firebase
        FirebaseApp.configure()

        // Configure appearance
        configureAppearance()
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(authManager)
                .environmentObject(classManager)
                .environmentObject(navigationManager)
                .preferredColorScheme(.dark) // Force dark mode for now
        }
    }

    private func configureAppearance() {
        // Configure navigation bar appearance
        let appearance = UINavigationBarAppearance()
        appearance.configureWithTransparentBackground()
        appearance.backgroundColor = UIColor(white: 0.11, alpha: 0.8)

        UINavigationBar.appearance().standardAppearance = appearance
        UINavigationBar.appearance().scrollEdgeAppearance = appearance

        // Configure tab bar appearance
        let tabBarAppearance = UITabBarAppearance()
        tabBarAppearance.configureWithTransparentBackground()
        tabBarAppearance.backgroundColor = UIColor(white: 0.11, alpha: 0.6)

        UITabBar.appearance().standardAppearance = tabBarAppearance
        UITabBar.appearance().scrollEdgeAppearance = tabBarAppearance
    }
}
