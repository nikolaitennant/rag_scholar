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

        // Set tab bar tint color to purple
        let purpleColor = UIColor(red: 0.61, green: 0.42, blue: 1.0, alpha: 1.0)
        UITabBar.appearance().tintColor = purpleColor
        UITabBar.appearance().unselectedItemTintColor = UIColor.gray

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
}
