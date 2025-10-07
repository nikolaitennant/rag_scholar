//
//  MainTabView.swift
//  RAGScholar
//
//  Main tab navigation with custom top bar
//

import SwiftUI

struct MainTabView: View {
    @EnvironmentObject var navigationManager: NavigationManager
    @EnvironmentObject var classManager: ClassManager
    @State private var keyboardVisible = false
    @State private var showCreateClass = false

    var body: some View {
        VStack(spacing: 0) {
            // Top Navigation Bar for workspace-level class management
            TopNavigationBar()
            
            TabView(selection: $navigationManager.selectedTab) {
                HomeView()
                    .tabItem {
                        Image(systemName: NavigationManager.Tab.home.icon)
                        Text(NavigationManager.Tab.home.rawValue)
                    }
                    .tag(NavigationManager.Tab.home)

                ChatView()
                    .tabItem {
                        Image(systemName: NavigationManager.Tab.chat.icon)
                        Text(NavigationManager.Tab.chat.rawValue)
                    }
                    .tag(NavigationManager.Tab.chat)
                    .onAppear {
                        // Force keyboard to be ready when chat appears
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                            // This helps ensure the view is ready for keyboard input
                        }
                    }

                DocumentsView()
                    .tabItem {
                        Image(systemName: NavigationManager.Tab.docs.icon)
                        Text(NavigationManager.Tab.docs.rawValue)
                    }
                    .tag(NavigationManager.Tab.docs)

                RewardsView()
                    .tabItem {
                        Image(systemName: NavigationManager.Tab.rewards.icon)
                        Text(NavigationManager.Tab.rewards.rawValue)
                    }
                    .tag(NavigationManager.Tab.rewards)
            }
            .tint(Color(red: 0.61, green: 0.42, blue: 1.0)) // #9C6BFF accent color
        }
        .background(
            LinearGradient(
                colors: [
                    Color(red: 0.05, green: 0.05, blue: 0.05), // #0D0D0D
                    Color(red: 0.08, green: 0.08, blue: 0.08)  // #141414
                ],
                startPoint: .top,
                endPoint: .bottom
            )
        )
        .preferredColorScheme(.dark)
        .toolbar(keyboardVisible ? .hidden : .visible, for: .tabBar)
        .onReceive(NotificationCenter.default.publisher(for: UIResponder.keyboardWillShowNotification)) { _ in
            keyboardVisible = true
        }
        .onReceive(NotificationCenter.default.publisher(for: UIResponder.keyboardWillHideNotification)) { _ in
            keyboardVisible = false
        }
        // TODO: Add GlobalSearchView when it's implemented
        // .overlay(
        //     // Global search modal overlay with slide-up animation
        //     Group {
        //         if navigationManager.showGlobalSearch {
        //             ZStack {
        //                 // Dimmed background
        //                 Color.black.opacity(0.4)
        //                     .ignoresSafeArea()
        //                     .onTapGesture {
        //                         withAnimation(.easeInOut(duration: 0.3)) {
        //                             navigationManager.showGlobalSearch = false
        //                         }
        //                     }
        //                 
        //                 // Modal content that slides up from bottom
        //                 VStack {
        //                     Spacer()
        //                     GlobalSearchView()
        //                         .transition(.move(edge: .bottom).combined(with: .opacity))
        //                 }
        //             }
        //         }
        //     }
        // )
        .overlay(
            // Shared modal background - present when any modal is showing
            Group {
                if navigationManager.showClassSwitcher || showCreateClass {
                    Color.black.opacity(0.9)
                        .ignoresSafeArea(.all)
                        .allowsHitTesting(true)
                        .onTapGesture {
                            withAnimation(.easeInOut(duration: 0.3)) {
                                navigationManager.showClassSwitcher = false
                                showCreateClass = false
                            }
                        }
                        .transition(.opacity)
                        .zIndex(9998) // Below both modals but above everything else
                }
            }
        )
        .overlay(
            // Class switcher modal overlay - placed last to ensure it's always on top
            Group {
                if navigationManager.showClassSwitcher {
                    ClassSwitcherView(
                        onDismiss: {
                            withAnimation(.easeInOut(duration: 0.3)) {
                                navigationManager.showClassSwitcher = false
                            }
                        },
                        onCreateClass: {
                            withAnimation(.easeInOut(duration: 0.3)) {
                                navigationManager.showClassSwitcher = false
                                showCreateClass = true
                            }
                        }
                    )
                    .transition(.opacity)
                    .zIndex(10000) // Very high zIndex to ensure it's above sheets and other modals
                }
            }
        )
        .overlay(
            // Create class modal overlay
            Group {
                if showCreateClass {
                    CreateClassView(onDismiss: {
                        withAnimation(.easeInOut(duration: 0.3)) {
                            showCreateClass = false
                        }
                    })
                    .zIndex(10001) // Above ClassSwitcherView
                }
            }
        )
    }
}

#Preview {
    MainTabView()
        .environmentObject(NavigationManager.shared)
        .environmentObject(ClassManager.shared)
        .environmentObject(AuthenticationManager.shared)
        .environmentObject(RewardsManager.shared)
        .environmentObject(ChatManager.shared)
        .environmentObject(DocumentManager.shared)
}
