//
//  ClassManager.swift
//  RAGScholar
//
//  Manages user classes and active class selection
//

import Foundation
import Combine

@MainActor
class ClassManager: ObservableObject {
    static let shared = ClassManager()

    @Published var classes: [UserClass] = []
    @Published var activeClass: UserClass?
    @Published var isLoading = false
    @Published var error: String?

    private let apiService = APIService.shared

    private init() {
        loadActiveClassFromStorage()
    }

    // MARK: - Persistence

    private func loadActiveClassFromStorage() {
        if let classId = UserDefaults.standard.string(forKey: "activeClassId"),
           let savedClass = classes.first(where: { $0.id == classId }) {
            activeClass = savedClass
        }
    }

    private func saveActiveClassToStorage() {
        if let classId = activeClass?.id {
            UserDefaults.standard.set(classId, forKey: "activeClassId")
        } else {
            UserDefaults.standard.removeObject(forKey: "activeClassId")
        }
    }

    // MARK: - API Methods

    func fetchClasses() async {
        isLoading = true
        error = nil

        do {
            classes = try await apiService.fetchClasses()

            // Auto-select active class
            if let savedId = UserDefaults.standard.string(forKey: "activeClassId"),
               let savedClass = classes.first(where: { $0.id == savedId }) {
                activeClass = savedClass
            } else if let firstClass = classes.first {
                selectClass(firstClass)
            }
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    func createClass(name: String, domainType: DomainType, description: String?) async {
        isLoading = true
        error = nil

        do {
            let newClass = try await apiService.createClass(
                name: name,
                domainType: domainType,
                description: description
            )
            classes.append(newClass)

            // Auto-select newly created class
            selectClass(newClass)

            // Add haptic feedback
            HapticManager.shared.success()
        } catch {
            self.error = error.localizedDescription
            HapticManager.shared.error()
        }

        isLoading = false
    }

    func updateClass(_ classId: String, name: String, domainType: DomainType, description: String?) async {
        isLoading = true
        error = nil

        do {
            try await apiService.updateClass(id: classId, name: name, domainType: domainType, description: description)

            // Update local state
            if let index = classes.firstIndex(where: { $0.id == classId }) {
                classes[index].name = name
                classes[index].domainType = domainType
                classes[index].description = description

                // Update active class if needed
                if activeClass?.id == classId {
                    activeClass = classes[index]
                }
            }

            HapticManager.shared.success()
        } catch {
            self.error = error.localizedDescription
            HapticManager.shared.error()
        }

        isLoading = false
    }

    func deleteClass(_ classId: String) async {
        isLoading = true
        error = nil

        do {
            try await apiService.deleteClass(id: classId)

            // Remove from local state
            classes.removeAll(where: { $0.id == classId })

            // If deleting active class, select first available or clear
            if activeClass?.id == classId {
                if let firstClass = classes.first {
                    selectClass(firstClass)
                } else {
                    activeClass = nil
                    saveActiveClassToStorage()
                }
            }

            HapticManager.shared.success()
        } catch {
            self.error = error.localizedDescription
            HapticManager.shared.error()
        }

        isLoading = false
    }

    func selectClass(_ userClass: UserClass) {
        activeClass = userClass
        saveActiveClassToStorage()
        HapticManager.shared.selectionFeedback()
    }
}
