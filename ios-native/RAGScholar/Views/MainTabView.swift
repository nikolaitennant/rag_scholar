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

    var body: some View {
        ZStack {
            // Background gradient
            LinearGradient(
                colors: [
                    Color(red: 0.1, green: 0.1, blue: 0.18),
                    Color(red: 0.09, green: 0.13, blue: 0.25),
                    Color(red: 0.06, green: 0.2, blue: 0.38)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            VStack(spacing: 0) {
                // Custom Top Navigation Bar
                TopNavigationBar()

                // Content based on selected tab
                TabView(selection: $navigationManager.selectedTab) {
                    HomeView()
                        .tag(NavigationManager.Tab.home)

                    ChatView()
                        .tag(NavigationManager.Tab.chat)

                    DocumentsView()
                        .tag(NavigationManager.Tab.docs)

                    RewardsView()
                        .tag(NavigationManager.Tab.rewards)
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
            }

            // Custom Tab Bar
            VStack {
                Spacer()
                CustomTabBar()
            }
        }
        .sheet(isPresented: $navigationManager.showClassSwitcher) {
            ClassSwitcherView()
        }
        .sheet(isPresented: $navigationManager.showGlobalSearch) {
            GlobalSearchView()
        }
    }
}

// MARK: - Custom Tab Bar

struct CustomTabBar: View {
    @EnvironmentObject var navigationManager: NavigationManager

    var body: some View {
        HStack(spacing: 0) {
            ForEach(NavigationManager.Tab.allCases, id: \.self) { tab in
                Button {
                    navigationManager.selectTab(tab)
                } label: {
                    VStack(spacing: 4) {
                        Image(systemName: tab.icon)
                            .font(.system(size: 24))
                            .foregroundColor(
                                navigationManager.selectedTab == tab ? .white : Color.white.opacity(0.5)
                            )

                        Text(tab.rawValue)
                            .font(.system(size: 10, weight: navigationManager.selectedTab == tab ? .medium : .regular))
                            .foregroundColor(
                                navigationManager.selectedTab == tab ? .white : Color.white.opacity(0.5)
                            )
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.bottom, 8)
        .background(
            .ultraThinMaterial
                .opacity(0.6)
        )
        .overlay(
            Rectangle()
                .fill(Color.white.opacity(0.1))
                .frame(height: 0.5),
            alignment: .top
        )
    }
}

#Preview {
    MainTabView()
        .environmentObject(NavigationManager.shared)
        .environmentObject(ClassManager.shared)
        .environmentObject(AuthenticationManager.shared)
}
