//
//  TopNavigationBar.swift
//  RAGScholar
//
//  Persistent top navigation bar with class switcher, search, and settings
//

import SwiftUI

struct TopNavigationBar: View {
    @EnvironmentObject var classManager: ClassManager
    @EnvironmentObject var navigationManager: NavigationManager

    var body: some View {
        HStack(spacing: 12) {
            // Class Switcher Button
            Button {
                navigationManager.toggleClassSwitcher()
            } label: {
                HStack(spacing: 6) {
                    Text(classManager.activeClass?.name ?? "Select Class")
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundColor(.white)
                        .lineLimit(1)

                    Image(systemName: "chevron.down")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.white.opacity(0.7))
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(
                    Color.white.opacity(0.1)
                        .cornerRadius(10)
                )
            }
            .buttonStyle(.plain)

            Spacer()

            // Search Button
            Button {
                navigationManager.toggleGlobalSearch()
            } label: {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 20, weight: .medium))
                    .foregroundColor(.white.opacity(0.8))
                    .frame(width: 36, height: 36)
                    .background(
                        Color.white.opacity(0.1)
                            .clipShape(Circle())
                    )
            }
            .buttonStyle(.plain)

            // Settings Button
            Button {
                // Navigate to settings
                navigationManager.selectedTab = .home // Placeholder
            } label: {
                Image(systemName: "gearshape.fill")
                    .font(.system(size: 20, weight: .medium))
                    .foregroundColor(.white.opacity(0.8))
                    .frame(width: 36, height: 36)
                    .background(
                        Color.white.opacity(0.1)
                            .clipShape(Circle())
                    )
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(
            .ultraThinMaterial
                .opacity(0.8)
        )
        .overlay(
            Rectangle()
                .fill(Color.white.opacity(0.1))
                .frame(height: 0.5),
            alignment: .bottom
        )
    }
}

#Preview {
    TopNavigationBar()
        .environmentObject(ClassManager.shared)
        .environmentObject(NavigationManager.shared)
        .background(Color.black)
}
