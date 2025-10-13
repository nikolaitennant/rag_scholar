//
//  ViewModifiers.swift
//  RAGScholar
//
//  iOS-specific view modifiers and styling extensions
//

import SwiftUI

// MARK: - Typography Extensions

extension Font {
    // iOS Typography System - matches React app
    static let iosLargeTitle = Font.system(size: 28, weight: .semibold)
    static let iosTitle = Font.system(size: 17, weight: .medium)
    static let iosSubtitle = Font.system(size: 15, weight: .regular)
    static let iosBody = Font.system(size: 17, weight: .regular)
    static let iosCaption = Font.system(size: 13, weight: .regular)
}

// MARK: - Glassmorphism Card Style

struct GlassmorphicCard: ViewModifier {
    var opacity: Double = 0.3

    func body(content: Content) -> some View {
        content
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color(red: 0.11, green: 0.11, blue: 0.12).opacity(opacity))
                    .background(
                        .ultraThinMaterial
                            .opacity(0.6)
                    )
            )
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(Color.white.opacity(0.1), lineWidth: 1)
            )
            .shadow(color: Color.black.opacity(0.2), radius: 6, x: 0, y: 2)
    }
}

// MARK: - Active Scale Effect

struct ActiveScaleEffect: ViewModifier {
    @State private var isPressed = false

    func body(content: Content) -> some View {
        content
            .scaleEffect(isPressed ? 0.98 : 1.0)
            .animation(.easeInOut(duration: 0.15), value: isPressed)
            .simultaneousGesture(
                DragGesture(minimumDistance: 0)
                    .onChanged { _ in
                        if !isPressed {
                            isPressed = true
                            HapticManager.shared.impact(.light)
                        }
                    }
                    .onEnded { _ in
                        isPressed = false
                    }
            )
    }
}

// MARK: - View Extensions

extension View {
    func glassmorphicCard(opacity: Double = 0.3) -> some View {
        modifier(GlassmorphicCard(opacity: opacity))
    }

    func activeScaleEffect() -> some View {
        modifier(ActiveScaleEffect())
    }
}

// MARK: - Color Extensions

extension Color {
    // iOS Dark Mode Colors - matches React app
    static let iosBackground = Color(red: 0.11, green: 0.11, blue: 0.12) // #1C1C1E
    static let iosSurface = Color(red: 0.17, green: 0.17, blue: 0.18) // #2C2C2E
    static let iosPurple = Color(red: 0.43, green: 0.37, blue: 0.99) // #6D5FFD
    static let iosPurpleLight = Color(red: 0.62, green: 0.47, blue: 1) // #9E78FF
}
