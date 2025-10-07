//
//  AuthenticationManager.swift
//  RAGScholar
//
//  Manages user authentication with Firebase
//

import Foundation
import FirebaseAuth
import Combine

@MainActor
class AuthenticationManager: ObservableObject {
    static let shared = AuthenticationManager()

    @Published var user: User?
    @Published var isAuthenticated = false
    @Published var isLoading = true
    @Published var error: String?

    private var authStateHandle: AuthStateDidChangeListenerHandle?

    private init() {
        registerAuthStateHandler()
    }

    private func registerAuthStateHandler() {
        authStateHandle = Auth.auth().addStateDidChangeListener { [weak self] _, user in
            Task { @MainActor in
                self?.user = user
                self?.isAuthenticated = user != nil
                self?.isLoading = false
            }
        }
    }

    func signIn(email: String, password: String) async throws {
        isLoading = true
        error = nil

        do {
            let result = try await Auth.auth().signIn(withEmail: email, password: password)
            user = result.user
            isAuthenticated = true
        } catch {
            self.error = error.localizedDescription
            throw error
        }

        isLoading = false
    }

    func signUp(email: String, password: String, displayName: String?) async throws {
        isLoading = true
        error = nil

        do {
            let result = try await Auth.auth().createUser(withEmail: email, password: password)
            user = result.user

            // Update display name if provided
            if let displayName = displayName {
                let changeRequest = result.user.createProfileChangeRequest()
                changeRequest.displayName = displayName
                try await changeRequest.commitChanges()
            }

            isAuthenticated = true
        } catch {
            self.error = error.localizedDescription
            throw error
        }

        isLoading = false
    }

    func signOut() throws {
        try Auth.auth().signOut()
        user = nil
        isAuthenticated = false
    }

    func resetPassword(email: String) async throws {
        try await Auth.auth().sendPasswordReset(withEmail: email)
    }

    deinit {
        if let handle = authStateHandle {
            Auth.auth().removeStateDidChangeListener(handle)
        }
    }
}
