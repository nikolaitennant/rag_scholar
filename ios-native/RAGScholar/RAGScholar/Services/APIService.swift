//
//  APIService.swift
//  RAGScholar
//
//  Core API service for backend communication
//

import Foundation
import Combine

class APIService {
    static let shared = APIService()

    private let baseURL: String
    private let session: URLSession

    private init() {
        // TODO: Move to configuration file
        self.baseURL = "http://localhost:8000" // Development
        // self.baseURL = "https://your-production-api.com" // Production

        let configuration = URLSessionConfiguration.default
        configuration.timeoutIntervalForRequest = 30
        configuration.timeoutIntervalForResource = 300
        self.session = URLSession(configuration: configuration)
    }

    // MARK: - Public Methods

    func getBaseURL() -> String {
        return baseURL
    }

    // MARK: - Authentication Token

    private var authToken: String? {
        // Retrieve Firebase ID token
        // This will be implemented with Firebase Auth
        return nil
    }

    // MARK: - Generic Request Method

    private func request<T: Decodable>(
        endpoint: String,
        method: String = "GET",
        body: Data? = nil,
        responseType: T.Type
    ) async throws -> T {
        guard let url = URL(string: "\(baseURL)\(endpoint)") else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let token = authToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        if let body = body {
            request.httpBody = body
        }

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.httpError(statusCode: httpResponse.statusCode)
        }

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return try decoder.decode(T.self, from: data)
    }

    // MARK: - Class Endpoints

    func fetchClasses() async throws -> [UserClass] {
        try await request(endpoint: "/api/classes", responseType: [UserClass].self)
    }

    func createClass(name: String, domainType: DomainType, description: String?) async throws -> UserClass {
        let body = CreateClassRequest(name: name, domainType: domainType, description: description)
        let data = try JSONEncoder().encode(body)
        return try await request(endpoint: "/api/classes", method: "POST", body: data, responseType: UserClass.self)
    }

    func updateClass(id: String, name: String, domainType: DomainType, description: String?) async throws {
        let body = UpdateClassRequest(name: name, domainType: domainType, description: description)
        let data = try JSONEncoder().encode(body)
        _ = try await request(endpoint: "/api/classes/\(id)", method: "PUT", body: data, responseType: EmptyResponse.self)
    }

    func deleteClass(id: String) async throws {
        _ = try await request(endpoint: "/api/classes/\(id)", method: "DELETE", responseType: EmptyResponse.self)
    }

    // MARK: - Chat Endpoints

    func sendMessage(
        query: String,
        sessionId: String?,
        classId: String?,
        className: String?,
        domainType: DomainType?
    ) async throws -> ChatResponse {
        let body = ChatRequest(
            query: query,
            sessionId: sessionId,
            classId: classId,
            className: className,
            domainType: domainType
        )
        let data = try JSONEncoder().encode(body)
        return try await request(endpoint: "/api/chat", method: "POST", body: data, responseType: ChatResponse.self)
    }

    func fetchSessions() async throws -> [ChatSession] {
        try await request(endpoint: "/api/sessions", responseType: [ChatSession].self)
    }

    func fetchSessionMessages(sessionId: String) async throws -> SessionMessagesResponse {
        try await request(endpoint: "/api/sessions/\(sessionId)/messages", responseType: SessionMessagesResponse.self)
    }

    func deleteSession(id: String) async throws {
        _ = try await request(endpoint: "/api/sessions/\(id)", method: "DELETE", responseType: EmptyResponse.self)
    }

    // MARK: - Document Endpoints

    func fetchDocuments() async throws -> [Document] {
        try await request(endpoint: "/api/documents", responseType: [Document].self)
    }

    func uploadDocument(file: Data, filename: String) async throws -> Document {
        // Multipart form data upload - implement separately
        throw APIError.notImplemented
    }

    func deleteDocument(id: String) async throws {
        _ = try await request(endpoint: "/api/documents/\(id)", method: "DELETE", responseType: EmptyResponse.self)
    }

    func assignDocumentToClass(documentId: String, classId: String, action: String) async throws {
        let body = ["action": action]
        let data = try JSONSerialization.data(withJSONObject: body)
        _ = try await request(
            endpoint: "/api/documents/\(documentId)/classes/\(classId)",
            method: "POST",
            body: data,
            responseType: EmptyResponse.self
        )
    }
}

// MARK: - Request/Response Models

struct CreateClassRequest: Codable {
    let name: String
    let domainType: DomainType
    let description: String?

    enum CodingKeys: String, CodingKey {
        case name
        case domainType = "domain_type"
        case description
    }
}

struct UpdateClassRequest: Codable {
    let name: String
    let domainType: DomainType
    let description: String?

    enum CodingKeys: String, CodingKey {
        case name
        case domainType = "domain_type"
        case description
    }
}

struct ChatRequest: Codable {
    let query: String
    let sessionId: String?
    let classId: String?
    let className: String?
    let domainType: DomainType?

    enum CodingKeys: String, CodingKey {
        case query
        case sessionId = "session_id"
        case classId = "class_id"
        case className = "class_name"
        case domainType = "domain_type"
    }
}

struct ChatResponse: Codable {
    let response: String
    let sessionId: String
    let chatName: String?
    let citations: [Citation]?

    enum CodingKeys: String, CodingKey {
        case response
        case sessionId = "session_id"
        case chatName = "chat_name"
        case citations
    }
}

struct SessionMessagesResponse: Codable {
    let messages: [Message]
}

struct EmptyResponse: Codable {}

// MARK: - API Errors

enum APIError: LocalizedError {
    case invalidURL
    case invalidResponse
    case httpError(statusCode: Int)
    case decodingError(Error)
    case notImplemented

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .invalidResponse:
            return "Invalid response from server"
        case .httpError(let statusCode):
            return "HTTP error: \(statusCode)"
        case .decodingError(let error):
            return "Decoding error: \(error.localizedDescription)"
        case .notImplemented:
            return "Feature not yet implemented"
        }
    }
}
