//
//  RAGScholarApp.swift
//  RAGScholar
//
//  Native iOS Application for RAG Scholar
//  Created: 2025
//

import SwiftUI
import FirebaseCore

class AppDelegate: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil) -> Bool {
        FirebaseApp.configure()
        return true
    }
}

@main
struct RAGScholarApp: App {
    // Register app delegate for Firebase setup
    @UIApplicationDelegateAdaptor(AppDelegate.self) var delegate

    @StateObject private var authManager = AuthenticationManager.shared
    @StateObject private var classManager = ClassManager.shared
    @StateObject private var chatManager = ChatManager.shared
    @StateObject private var documentManager = DocumentManager.shared
    @StateObject private var rewardsManager = RewardsManager.shared
    @StateObject private var navigationManager = NavigationManager.shared

    init() {
        // Configure appearance
        configureAppearance()
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(authManager)
                .environmentObject(classManager)
                .environmentObject(chatManager)
                .environmentObject(documentManager)
                .environmentObject(rewardsManager)
                .environmentObject(navigationManager)
                .environmentObject(ThemeManager.shared)
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
