//
//  AuthenticationManager.swift
//  RAGScholar
//
//  Manages user authentication with Firebase
//

import Foundation
import FirebaseAuth
import Combine

struct UserProfile: Codable {
    let id: String
    let email: String
    let createdAt: String
    let profile: Profile?

    struct Profile: Codable {
        let displayName: String?
        let bio: String?
        let researchInterests: [String]?
        let preferredDomains: [String]?
        let profileImage: String?

        enum CodingKeys: String, CodingKey {
            case displayName = "display_name"
            case bio
            case researchInterests = "research_interests"
            case preferredDomains = "preferred_domains"
            case profileImage = "profile_image"
        }
    }

    enum CodingKeys: String, CodingKey {
        case id
        case email
        case createdAt = "created_at"
        case profile
    }
}

@MainActor
class AuthenticationManager: ObservableObject {
    static let shared = AuthenticationManager()

    @Published var user: User?
    @Published var userProfile: UserProfile?
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

                if user != nil {
                    await self?.fetchUserProfile()
                } else {
                    self?.userProfile = nil
                }

                self?.isLoading = false
            }
        }
    }

    func fetchUserProfile() async {
        guard let user = user else { return }

        do {
            let token = try await user.getIDToken()
            let baseURL = APIService.shared.getBaseURL()

            guard let url = URL(string: "\(baseURL)/user/profile") else { return }

            var request = URLRequest(url: url)
            request.httpMethod = "GET"
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")

            let (data, _) = try await URLSession.shared.data(for: request)
            let profile = try JSONDecoder().decode(UserProfile.self, from: data)
            self.userProfile = profile
        } catch {
            print("Failed to fetch user profile: \(error)")
        }
    }

    func signIn(email: String, password: String) async throws {
        isLoading = true
        error = nil

        do {
            let result = try await Auth.auth().signIn(withEmail: email, password: password)
            user = result.user
            isAuthenticated = true
            await fetchUserProfile()
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
            await fetchUserProfile()
        } catch {
            self.error = error.localizedDescription
            throw error
        }

        isLoading = false
    }

    func signOut() throws {
        try Auth.auth().signOut()
        user = nil
        userProfile = nil
        isAuthenticated = false
    }

    func resetPassword(email: String) async throws {
        try await Auth.auth().sendPasswordReset(withEmail: email)
    }

    func refreshUser() async {
        if let currentUser = Auth.auth().currentUser {
            try? await currentUser.reload()
            self.user = Auth.auth().currentUser
        }
    }

    func updateDisplayName(_ newDisplayName: String) async throws {
        guard let currentUser = Auth.auth().currentUser else { return }

        let changeRequest = currentUser.createProfileChangeRequest()
        changeRequest.displayName = newDisplayName
        try await changeRequest.commitChanges()

        try? await currentUser.reload()
        self.user = Auth.auth().currentUser
    }

    func updateUserProfile(bio: String? = nil, researchInterests: [String]? = nil, preferredDomains: [String]? = nil, profileImage: String? = nil) async throws {
        guard let user = user else { return }

        let token = try await user.getIDToken()
        let baseURL = APIService.shared.getBaseURL()

        guard let url = URL(string: "\(baseURL)/user/profile") else { return }

        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        var body: [String: Any] = [:]
        if let bio = bio { body["bio"] = bio }
        if let researchInterests = researchInterests { body["research_interests"] = researchInterests }
        if let preferredDomains = preferredDomains { body["preferred_domains"] = preferredDomains }
        if let profileImage = profileImage { body["profile_image"] = profileImage }

        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (_, _) = try await URLSession.shared.data(for: request)
        await fetchUserProfile()
    }

    deinit {
        if let handle = authStateHandle {
            Auth.auth().removeStateDidChangeListener(handle)
        }
    }
}
