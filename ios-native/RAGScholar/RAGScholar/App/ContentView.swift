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
            // Fetch classes when user is authenticated
            if authManager.isAuthenticated && classManager.classes.isEmpty {
                await classManager.fetchClasses()
            }
        }
        .onChange(of: authManager.isAuthenticated) {
            // Fetch classes when user logs in
            if authManager.isAuthenticated {
                Task {
                    await classManager.fetchClasses()
                }
            }
        }
    }
}

#Preview {
    ContentView()
        .environmentObject(AuthenticationManager.shared)
        .environmentObject(ClassManager.shared)
        .environmentObject(NavigationManager.shared)
}
