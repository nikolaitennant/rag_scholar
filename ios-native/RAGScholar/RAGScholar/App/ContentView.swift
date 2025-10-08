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

    var body: some View {
        Group {
            if authManager.isLoading {
                SplashScreenView()
            } else if authManager.isAuthenticated {
                if classManager.classes.isEmpty && !classManager.isLoading {
                    ClassOnboardingView()
                } else {
                    MainTabView()
                }
            } else {
                LoginView()
            }
        }
        .animation(.easeInOut, value: authManager.isAuthenticated)
        .animation(.easeInOut, value: classManager.classes.isEmpty)
        .task {
            // Fetch all data when user is authenticated
            if authManager.isAuthenticated {
                await fetchAllData()
            }
        }
        .onChange(of: authManager.isAuthenticated) {
            // Fetch all data when user logs in
            if authManager.isAuthenticated {
                Task {
                    await fetchAllData()
                }
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
