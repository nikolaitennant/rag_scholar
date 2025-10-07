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
                if classManager.classes.isEmpty {
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
    }
}

#Preview {
    ContentView()
        .environmentObject(AuthenticationManager.shared)
        .environmentObject(ClassManager.shared)
        .environmentObject(NavigationManager.shared)
}
