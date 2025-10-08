//
//  ChatManager.swift
//  RAGScholar
//
//  Manages chat sessions and messages
//

import Foundation
import Combine
import UIKit

@MainActor
class ChatManager: ObservableObject {
    static let shared = ChatManager()

    @Published var sessions: [ChatSession] = []
    @Published var currentSession: ChatSession?
    @Published var messages: [Message] = []
    @Published var isLoading = false
    @Published var isSendingMessage = false
    @Published var error: String?

    private let apiService = APIService.shared

    private init() {}

    // MARK: - Session Management

    func fetchSessions(for classId: String? = nil) async {
        isLoading = true
        error = nil

        do {
            sessions = try await apiService.fetchSessions()

            // Filter by class if specified
            if let classId = classId {
                sessions = sessions.filter { $0.classId == classId }
            }

            // Sort by most recent
            sessions.sort { $0.updatedAt > $1.updatedAt }
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    func loadSession(_ sessionId: String) async {
        isLoading = true
        error = nil

        do {
            let response = try await apiService.fetchSessionMessages(sessionId: sessionId)
            messages = response.messages
            currentSession = sessions.first(where: { $0.id == sessionId })

            // Scroll to bottom after loading
            HapticManager.shared.selectionFeedback()
        } catch {
            self.error = error.localizedDescription
            HapticManager.shared.error()
        }

        isLoading = false
    }

    func startNewSession() async {
        // Clear current session to start fresh
        currentSession = nil
        messages = []
        HapticManager.shared.impact(.medium)
    }

    func deleteSession(_ sessionId: String) async {
        do {
            try await apiService.deleteSession(id: sessionId)

            // Remove from local state
            sessions.removeAll(where: { $0.id == sessionId })

            // Clear current session if it was deleted
            if currentSession?.id == sessionId {
                currentSession = nil
                messages = []
            }

            HapticManager.shared.success()
        } catch {
            self.error = error.localizedDescription
            HapticManager.shared.error()
        }
    }

    func startNewChat() {
        currentSession = nil
        messages = []
        HapticManager.shared.impact(.light)
    }

    // MARK: - Message Handling

    func sendMessage(
        query: String,
        classId: String?,
        className: String?,
        domainType: DomainType?
    ) async {
        guard !query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            return
        }

        // Add user message to UI immediately
        let userMessage = Message(role: .user, content: query)
        messages.append(userMessage)

        isSendingMessage = true
        error = nil

        do {
            // Get API settings from UserDefaults
            let apiKey = UserDefaults.standard.string(forKey: "api_key")
            let model = UserDefaults.standard.string(forKey: "preferred_model") ?? "gpt-5-mini"
            let temperature = UserDefaults.standard.double(forKey: "temperature")
            let maxTokens = UserDefaults.standard.integer(forKey: "max_tokens")

            let response = try await apiService.sendMessage(
                query: query,
                sessionId: currentSession?.id,
                classId: classId,
                className: className,
                domainType: domainType,
                apiKey: apiKey,
                model: model,
                temperature: temperature == 0 ? nil : temperature,
                maxTokens: maxTokens == 0 ? nil : maxTokens
            )

            // Add assistant response
            let assistantMessage = Message(
                role: .assistant,
                content: response.response,
                citations: response.citations
            )
            messages.append(assistantMessage)

            // Update or create session
            if let sessionId = currentSession?.id {
                // Update existing session
                if let index = sessions.firstIndex(where: { $0.id == sessionId }) {
                    sessions[index].name = response.chatName ?? sessions[index].name
                    sessions[index] = ChatSession(
                        id: sessions[index].id,
                        name: response.chatName ?? sessions[index].name,
                        messageCount: messages.count,
                        updatedAt: Date(),
                        classId: sessions[index].classId
                    )
                    currentSession = sessions[index]
                }
            } else {
                // Create new session
                let newSession = ChatSession(
                    id: response.sessionId,
                    name: response.chatName ?? "New Chat",
                    messageCount: messages.count,
                    updatedAt: Date(),
                    classId: classId
                )
                sessions.insert(newSession, at: 0)
                currentSession = newSession
            }

            HapticManager.shared.success()
        } catch {
            // Remove user message on error
            messages.removeLast()
            self.error = error.localizedDescription
            HapticManager.shared.error()
        }

        isSendingMessage = false
    }

    // MARK: - Helper Methods

    func getRecentSessions(for classId: String?, limit: Int = 5) -> [ChatSession] {
        var filtered = sessions

        if let classId = classId {
            filtered = filtered.filter { $0.classId == classId }
        }

        return Array(filtered.prefix(limit))
    }

    func formatTimestamp(_ date: Date) -> String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter.localizedString(for: date, relativeTo: Date())
    }
}
