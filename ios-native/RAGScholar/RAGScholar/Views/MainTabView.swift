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
    @State private var showEditClass = false
    @State private var showManageDocuments = false
    @State private var classToEdit: UserClass?

    var body: some View {
        ZStack {
            // Main tabs with tab bar (Home, Docs, Classes)
            mainTabsContent
                .overlay(modalBackground)
                .overlay(createClassOverlay)
                .overlay(editClassOverlay)
                .overlay(manageDocumentsOverlay)
                .gesture(swipeLeftToChat)

            // Chat overlay (full screen, no tab bar)
            if navigationManager.showChat {
                chatOverlay
                    .transition(.move(edge: .trailing))
                    .zIndex(100)
            }
        }
    }

    private var swipeLeftToChat: some Gesture {
        DragGesture(minimumDistance: 30)
            .onEnded { value in
                let translation = value.translation.width

                // Swipe left to open chat
                if translation < -100 && !navigationManager.showChat {
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                        navigationManager.openChat()
                    }
                }
            }
    }

    private var chatOverlay: some View {
        NavigationStack {
            ChatView()
                .navigationBarTitleDisplayMode(.inline)
        }
        .tint(colorScheme == .dark ? .white : .black)
        .background(backgroundGradient)
        .gesture(
            DragGesture(minimumDistance: 30)
                .onEnded { value in
                    let translation = value.translation.width

                    // Swipe right to close chat
                    if translation > 100 {
                        withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                            navigationManager.closeChat()
                        }
                    }
                }
        )
    }

    private var mainTabsContent: some View {
        TabView(selection: $navigationManager.selectedTab) {
            NavigationStack {
                HomeView()
                    .navigationBarTitleDisplayMode(.inline)
            }
            .tint(colorScheme == .dark ? .white : .black)
            .tabItem {
                Image(systemName: NavigationManager.Tab.home.icon)
                Text(NavigationManager.Tab.home.rawValue)
            }
            .tag(NavigationManager.Tab.home)

            NavigationStack {
                DocumentsView()
                    .navigationBarTitleDisplayMode(.inline)
            }
            .tint(colorScheme == .dark ? .white : .black)
            .tabItem {
                Image(systemName: NavigationManager.Tab.docs.icon)
                Text(NavigationManager.Tab.docs.rawValue)
            }
            .tag(NavigationManager.Tab.docs)

            NavigationStack {
                ClassesView()
                    .navigationBarTitleDisplayMode(.inline)
            }
            .tint(colorScheme == .dark ? .white : .black)
            .tabItem {
                Image(systemName: NavigationManager.Tab.classes.icon)
                Text(NavigationManager.Tab.classes.rawValue)
            }
            .tag(NavigationManager.Tab.classes)

            // Chat tab - will trigger overlay
            Color.clear
                .tabItem {
                    Image(systemName: NavigationManager.Tab.chat.icon)
                    Text(NavigationManager.Tab.chat.rawValue)
                }
                .tag(NavigationManager.Tab.chat)
        }
        .background(backgroundGradient)
        .tint(Color(red: 0.61, green: 0.42, blue: 1.0))
        .toolbar(keyboardVisible ? .hidden : .visible, for: .tabBar)
        .onReceive(NotificationCenter.default.publisher(for: UIResponder.keyboardWillShowNotification)) { _ in
            keyboardVisible = true
        }
        .onReceive(NotificationCenter.default.publisher(for: UIResponder.keyboardWillHideNotification)) { _ in
            keyboardVisible = false
        }
        .onChange(of: navigationManager.selectedTab) { oldValue, newValue in
            // When chat tab is selected, show overlay
            if newValue == .chat {
                navigationManager.openChat()
            }
        }
    }

    @Environment(\.colorScheme) var colorScheme

    private var backgroundGradient: some View {
        LinearGradient(
            colors: colorScheme == .dark ? [
                Color(red: 0.05, green: 0.05, blue: 0.05),
                Color(red: 0.08, green: 0.08, blue: 0.08)
            ] : [
                Color(red: 0.95, green: 0.95, blue: 0.97),
                Color(red: 0.92, green: 0.92, blue: 0.95)
            ],
            startPoint: .top,
            endPoint: .bottom
        )
    }

    private var modalBackground: some View {
        Group {
            if showCreateClass || showEditClass || showManageDocuments {
                (colorScheme == .dark ? Color.black.opacity(0.9) : Color.black.opacity(0.5))
                    .ignoresSafeArea(.all)
                    .allowsHitTesting(true)
                    .onTapGesture {
                        withAnimation(.easeInOut(duration: 0.3)) {
                            showCreateClass = false
                            showEditClass = false
                            showManageDocuments = false
                            classToEdit = nil
                        }
                    }
                    .transition(.opacity)
                    .zIndex(9998)
            }
        }
    }

    private var createClassOverlay: some View {
        Group {
            if showCreateClass {
                CreateClassView(onDismiss: {
                    withAnimation(.easeInOut(duration: 0.3)) {
                        showCreateClass = false
                    }
                })
                .zIndex(10001)
            }
        }
    }

    private var editClassOverlay: some View {
        Group {
            if showEditClass, let classToEdit = classToEdit {
                EditClassView(
                    classToEdit: classToEdit,
                    onDismiss: {
                        withAnimation(.easeInOut(duration: 0.3)) {
                            showEditClass = false
                            self.classToEdit = nil
                        }
                    }
                )
                .zIndex(10001)
            }
        }
    }

    private var manageDocumentsOverlay: some View {
        Group {
            if showManageDocuments, let classToEdit = classToEdit {
                ManageDocumentsView(
                    classItem: classToEdit,
                    onDismiss: {
                        withAnimation(.easeInOut(duration: 0.3)) {
                            showManageDocuments = false
                            self.classToEdit = nil
                        }
                    }
                )
                .zIndex(10001)
            }
        }
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
        .environmentObject(ThemeManager.shared)
}
