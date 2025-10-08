//
//  ThemeManager.swift
//  RAGScholar
//
//  Manages app theme colors and preferences
//

import SwiftUI
import Combine

@MainActor
class ThemeManager: ObservableObject {
    static let shared = ThemeManager()

    @Published var isDarkMode: Bool = false
    @Published var background: String = "classic"

    private var cancellables = Set<AnyCancellable>()

    init() {
        self.isDarkMode = UserDefaults.standard.bool(forKey: "isDarkMode")
        self.background = UserDefaults.standard.string(forKey: "background") ?? "classic"

        // Observe changes and save to UserDefaults
        $isDarkMode
            .dropFirst()
            .sink { UserDefaults.standard.set($0, forKey: "isDarkMode") }
            .store(in: &cancellables)

        $background
            .dropFirst()
            .sink { UserDefaults.standard.set($0, forKey: "background") }
            .store(in: &cancellables)
    }

    // Background colors
    func backgroundColor(for colorScheme: ColorScheme) -> Color {
        colorScheme == .dark ? Color(red: 0.05, green: 0.05, blue: 0.05) : Color.white
    }

    func secondaryBackgroundColor(for colorScheme: ColorScheme) -> Color {
        colorScheme == .dark ? Color(red: 0.08, green: 0.08, blue: 0.08) : Color(red: 0.95, green: 0.95, blue: 0.97)
    }

    func cardBackgroundColor(for colorScheme: ColorScheme) -> Color {
        colorScheme == .dark ? Color(red: 0.11, green: 0.11, blue: 0.12) : Color.white
    }

    // Text colors
    func primaryTextColor(for colorScheme: ColorScheme) -> Color {
        colorScheme == .dark ? .white : .black
    }

    func secondaryTextColor(for colorScheme: ColorScheme) -> Color {
        colorScheme == .dark ? Color.white.opacity(0.7) : Color.black.opacity(0.6)
    }

    func tertiaryTextColor(for colorScheme: ColorScheme) -> Color {
        colorScheme == .dark ? Color.white.opacity(0.5) : Color.black.opacity(0.4)
    }

    // Input colors
    func inputBackgroundColor(for colorScheme: ColorScheme) -> Color {
        colorScheme == .dark ? Color.white.opacity(0.1) : Color.black.opacity(0.05)
    }

    func inputBorderColor(for colorScheme: ColorScheme) -> Color {
        colorScheme == .dark ? Color.white.opacity(0.2) : Color.black.opacity(0.1)
    }

    // Accent colors (same for both modes)
    let accentColor = Color(red: 0.61, green: 0.42, blue: 1.0)
    let accentGradient = LinearGradient(
        colors: [
            Color(red: 0.61, green: 0.42, blue: 1.0),
            Color(red: 0.64, green: 0.47, blue: 1.0)
        ],
        startPoint: .leading,
        endPoint: .trailing
    )

    let buttonGradient = LinearGradient(
        colors: [
            Color(red: 0.3, green: 0.6, blue: 1.0),
            Color(red: 0.6, green: 0.4, blue: 1.0)
        ],
        startPoint: .leading,
        endPoint: .trailing
    )
}
