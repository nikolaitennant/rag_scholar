//
//  APIService.swift
//  RAGScholar
//
//  Core API service for backend communication
//

import Foundation
import Combine
import FirebaseAuth

class APIService {
    static let shared = APIService()

    private let baseURL: String
    private let session: URLSession

    private init() {
        // TODO: Move to configuration file
        self.baseURL = "http://localhost:8000/api/v1" // Development
        // self.baseURL = "https://your-production-api.com/api/v1" // Production

        let configuration = URLSessionConfiguration.default
        configuration.timeoutIntervalForRequest = 30
        configuration.timeoutIntervalForResource = 300
        self.session = URLSession(configuration: configuration)
    }

    // MARK: - Public Methods

    func getBaseURL() -> String {
        return baseURL
    }

    // MARK: - Authentication Token Helper

    func getAuthToken() async throws -> String? {
        guard let user = Auth.auth().currentUser else {
            return nil
        }
        return try await user.getIDToken()
    }

    // MARK: - Generic Request Method

    private func request<T: Decodable>(
        endpoint: String,
        method: String = "GET",
        body: Data? = nil,
        queryItems: [URLQueryItem]? = nil,
        responseType: T.Type
    ) async throws -> T {
        var urlString = "\(baseURL)\(endpoint)"

        // Add query parameters if provided
        if let queryItems = queryItems, !queryItems.isEmpty {
            var components = URLComponents(string: urlString)
            components?.queryItems = queryItems
            urlString = components?.url?.absoluteString ?? urlString
        }

        guard let url = URL(string: urlString) else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("XMLHttpRequest", forHTTPHeaderField: "X-Requested-With")
        request.setValue("no-cache, no-store, must-revalidate", forHTTPHeaderField: "Cache-Control")

        // Add auth token
        if let token = try? await getAuthToken() {
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
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        return try decoder.decode(T.self, from: data)
    }

    // MARK: - Class Endpoints

    func fetchClasses() async throws -> [UserClass] {
        try await request(endpoint: "/classes/", responseType: [UserClass].self)
    }

    func createClass(name: String, domainType: DomainType, description: String?) async throws -> UserClass {
        let body = CreateClassRequest(name: name, domainType: domainType, description: description)
        let encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
        let data = try encoder.encode(body)
        return try await request(endpoint: "/classes/", method: "POST", body: data, responseType: UserClass.self)
    }

    func updateClass(id: String, name: String, domainType: DomainType, description: String?) async throws {
        let body = UpdateClassRequest(name: name, domainType: domainType, description: description)
        let encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
        let data = try encoder.encode(body)
        _ = try await request(endpoint: "/classes/\(id)", method: "PUT", body: data, responseType: EmptyResponse.self)
    }

    func deleteClass(id: String) async throws {
        _ = try await request(endpoint: "/classes/\(id)", method: "DELETE", responseType: EmptyResponse.self)
    }

    // MARK: - Chat Endpoints

    func sendMessage(
        query: String,
        sessionId: String?,
        classId: String?,
        className: String?,
        domainType: DomainType?,
        apiKey: String?,
        model: String?,
        temperature: Double?,
        maxTokens: Int?
    ) async throws -> ChatResponse {
        let body = ChatRequest(
            query: query,
            sessionId: sessionId,
            classId: classId,
            className: className,
            domainType: domainType,
            apiKey: apiKey,
            model: model,
            temperature: temperature,
            maxTokens: maxTokens
        )
        let encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
        let data = try encoder.encode(body)
        return try await request(endpoint: "/chat/chat", method: "POST", body: data, responseType: ChatResponse.self)
    }

    func fetchSessions() async throws -> [ChatSession] {
        try await request(endpoint: "/sessions", responseType: [ChatSession].self)
    }

    func fetchSessionMessages(sessionId: String) async throws -> SessionMessagesResponse {
        try await request(endpoint: "/sessions/\(sessionId)/messages", responseType: SessionMessagesResponse.self)
    }

    func updateSession(id: String, name: String) async throws {
        let body = ["name": name]
        let data = try JSONSerialization.data(withJSONObject: body)
        _ = try await request(endpoint: "/sessions/\(id)", method: "PUT", body: data, responseType: EmptyResponse.self)
    }

    func deleteSession(id: String) async throws {
        _ = try await request(endpoint: "/sessions/\(id)", method: "DELETE", responseType: EmptyResponse.self)
    }

    // MARK: - Document Endpoints

    func fetchDocuments() async throws -> [Document] {
        try await request(endpoint: "/documents/", responseType: [Document].self)
    }

    func uploadDocument(file: Data, filename: String, collection: String = "database", apiKey: String?) async throws -> Document {
        guard let url = URL(string: "\(baseURL)/documents/upload") else {
            throw APIError.invalidURL
        }

        var components = URLComponents(url: url, resolvingAgainstBaseURL: false)
        var queryItems = [URLQueryItem(name: "collection", value: collection)]
        if let apiKey = apiKey {
            queryItems.append(URLQueryItem(name: "api_key", value: apiKey))
        }
        components?.queryItems = queryItems

        guard let uploadURL = components?.url else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: uploadURL)
        request.httpMethod = "POST"

        let boundary = UUID().uuidString
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        if let token = try? await getAuthToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        var body = Data()
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"file\"; filename=\"\(filename)\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: application/octet-stream\r\n\r\n".data(using: .utf8)!)
        body.append(file)
        body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)

        request.httpBody = body

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.httpError(statusCode: httpResponse.statusCode)
        }

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        return try decoder.decode(Document.self, from: data)
    }

    func updateDocument(id: String, filename: String, apiKey: String?) async throws -> Document {
        let body = ["filename": filename]
        let encoder = JSONEncoder()
        let data = try encoder.encode(body)

        var queryItems: [URLQueryItem] = []
        if let apiKey = apiKey {
            queryItems.append(URLQueryItem(name: "api_key", value: apiKey))
        }

        return try await request(endpoint: "/documents/\(id)", method: "PUT", body: data, queryItems: queryItems, responseType: Document.self)
    }

    func deleteDocument(id: String, apiKey: String?) async throws {
        var queryItems: [URLQueryItem] = []
        if let apiKey = apiKey {
            queryItems.append(URLQueryItem(name: "api_key", value: apiKey))
        }

        _ = try await request(endpoint: "/documents/\(id)", method: "DELETE", queryItems: queryItems, responseType: EmptyResponse.self)
    }

    func assignDocumentToClass(documentId: String, documentSource: String, classId: String, operation: String = "add", apiKey: String?) async throws {
        let body = ["document_source": documentSource, "class_id": classId, "operation": operation]
        let data = try JSONSerialization.data(withJSONObject: body)

        var queryItems: [URLQueryItem] = []
        if let apiKey = apiKey {
            queryItems.append(URLQueryItem(name: "api_key", value: apiKey))
        }

        _ = try await request(
            endpoint: "/documents/\(documentId)/assign-class",
            method: "POST",
            body: data,
            queryItems: queryItems,
            responseType: EmptyResponse.self
        )
    }

    // MARK: - User Profile Endpoints

    func getCurrentUser() async throws -> UserProfile {
        try await request(endpoint: "/me", responseType: UserProfile.self)
    }

    func updateProfile(bio: String?, researchInterests: [String]?, preferredDomains: [String]?, profileImage: String?) async throws {
        var body: [String: Any] = [:]
        if let bio = bio { body["bio"] = bio }
        if let researchInterests = researchInterests { body["research_interests"] = researchInterests }
        if let preferredDomains = preferredDomains { body["preferred_domains"] = preferredDomains }
        if let profileImage = profileImage { body["profile_image"] = profileImage }

        let data = try JSONSerialization.data(withJSONObject: body)
        _ = try await request(endpoint: "/profile", method: "PUT", body: data, responseType: EmptyResponse.self)
    }

    func grantEarlyAdopter() async throws {
        _ = try await request(endpoint: "/grant-early-adopter", method: "POST", responseType: EmptyResponse.self)
    }

    func refreshAchievements() async throws -> UserProfile {
        try await request(endpoint: "/me", responseType: UserProfile.self)
    }

    // MARK: - API Settings Endpoints

    func getAPISettings() async throws -> APISettings {
        try await request(endpoint: "/api-settings", responseType: APISettings.self)
    }

    func updateAPISettings(apiKey: String?, preferredModel: String?, temperature: Double?, maxTokens: Int?, timezone: String?) async throws {
        var body: [String: Any] = [:]
        if let apiKey = apiKey { body["api_key"] = apiKey }
        if let preferredModel = preferredModel { body["preferred_model"] = preferredModel }
        if let temperature = temperature { body["temperature"] = temperature }
        if let maxTokens = maxTokens { body["max_tokens"] = maxTokens }
        if let timezone = timezone { body["timezone"] = timezone }

        let data = try JSONSerialization.data(withJSONObject: body)
        _ = try await request(endpoint: "/api-settings", method: "POST", body: data, responseType: EmptyResponse.self)
    }

    // MARK: - Health Check

    func health() async throws -> HealthResponse {
        try await request(endpoint: "/health/", responseType: HealthResponse.self)
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
    let apiKey: String?
    let model: String?
    let temperature: Double?
    let maxTokens: Int?

    enum CodingKeys: String, CodingKey {
        case query
        case sessionId = "session_id"
        case classId = "class_id"
        case className = "class_name"
        case domainType = "domain_type"
        case apiKey = "api_key"
        case model
        case temperature
        case maxTokens = "max_tokens"
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

struct APISettings: Codable {
    let apiKey: String?
    let preferredModel: String?
    let temperature: Double?
    let maxTokens: Int?
    let timezone: String?

    enum CodingKeys: String, CodingKey {
        case apiKey = "api_key"
        case preferredModel = "preferred_model"
        case temperature
        case maxTokens = "max_tokens"
        case timezone
    }
}

struct HealthResponse: Codable {
    let status: String
}

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
