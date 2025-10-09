//
//  ContentView.swift
//  RAGScholar
//
//  Main content router
//

import SwiftUI

struct ContentView: View {
    @EnvironmentObject var authManager: AuthenticationManager
    @EnvironmentObject var classManager: ClassManager
    @EnvironmentObject var documentManager: DocumentManager
    @EnvironmentObject var rewardsManager: RewardsManager
    @State private var hasInitiallyFetched = false

    var body: some View {
        Group {
            if authManager.isLoading {
                SplashScreenView()
            } else if authManager.isAuthenticated {
                MainTabView()
            } else {
                LoginView()
            }
        }
        .animation(.easeInOut, value: authManager.isAuthenticated)
        .animation(.easeInOut, value: classManager.classes.isEmpty)
        .task {
            // Only fetch once on initial load
            if authManager.isAuthenticated && !hasInitiallyFetched {
                await fetchAllData()
                hasInitiallyFetched = true
            }
        }
        .onChange(of: authManager.isAuthenticated) {
            // Fetch when user logs in, but not when they log out
            if authManager.isAuthenticated && !hasInitiallyFetched {
                Task {
                    await fetchAllData()
                    hasInitiallyFetched = true
                }
            } else if !authManager.isAuthenticated {
                // Reset when user logs out
                hasInitiallyFetched = false
            }
        }
    }

    private func fetchAllData() async {
        // Fetch everything in parallel
        await withTaskGroup(of: Void.self) { group in
            group.addTask { await classManager.fetchClasses() }
            group.addTask { await documentManager.fetchDocuments() }
            group.addTask { await rewardsManager.fetchUserStats() }
            group.addTask { await rewardsManager.fetchAchievements() }
        }
    }
}

#Preview {
    ContentView()
        .environmentObject(AuthenticationManager.shared)
        .environmentObject(ClassManager.shared)
        .environmentObject(DocumentManager.shared)
        .environmentObject(RewardsManager.shared)
        .environmentObject(NavigationManager.shared)
}
