//
//  HapticManager.swift
//  RAGScholar
//
//  Manages haptic feedback throughout the app
//

import UIKit

class HapticManager {
    static let shared = HapticManager()

    private let impactLight = UIImpactFeedbackGenerator(style: .light)
    private let impactMedium = UIImpactFeedbackGenerator(style: .medium)
    private let impactHeavy = UIImpactFeedbackGenerator(style: .heavy)
    private let impactSoft = UIImpactFeedbackGenerator(style: .soft)
    private let impactRigid = UIImpactFeedbackGenerator(style: .rigid)
    private let selection = UISelectionFeedbackGenerator()
    private let notification = UINotificationFeedbackGenerator()

    private init() {
        // Prepare generators
        impactLight.prepare()
        impactMedium.prepare()
        impactHeavy.prepare()
        selection.prepare()
        notification.prepare()
    }

    // MARK: - Impact Feedback

    func impact(_ style: UIImpactFeedbackGenerator.FeedbackStyle = .medium) {
        switch style {
        case .light:
            impactLight.impactOccurred()
            impactLight.prepare()
        case .medium:
            impactMedium.impactOccurred()
            impactMedium.prepare()
        case .heavy:
            impactHeavy.impactOccurred()
            impactHeavy.prepare()
        case .soft:
            impactSoft.impactOccurred()
            impactSoft.prepare()
        case .rigid:
            impactRigid.impactOccurred()
            impactRigid.prepare()
        @unknown default:
            impactMedium.impactOccurred()
            impactMedium.prepare()
        }
    }

    // MARK: - Selection Feedback

    func selection() {
        selection.selectionChanged()
        selection.prepare()
    }

    // MARK: - Notification Feedback

    func success() {
        notification.notificationOccurred(.success)
        notification.prepare()
    }

    func warning() {
        notification.notificationOccurred(.warning)
        notification.prepare()
    }

    func error() {
        notification.notificationOccurred(.error)
        notification.prepare()
    }

    // MARK: - Custom Patterns

    func buttonPress() {
        impact(.light)
    }

    func cardSwipe() {
        impact(.soft)
    }

    func toggle() {
        impact(.light)
    }

    func longPress() {
        impact(.medium)
    }

    func refresh() {
        impact(.medium)
    }
}
