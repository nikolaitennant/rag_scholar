//
//  ChatView.swift
//  RAGScholar
//
//  Chat interface with message display, input, and citations
//

import SwiftUI

struct ChatView: View {
    @EnvironmentObject var chatManager: ChatManager
    @EnvironmentObject var classManager: ClassManager
    @EnvironmentObject var rewardsManager: RewardsManager

    @State private var inputText: String = ""
    @State private var scrollProxy: ScrollViewProxy?
    @FocusState private var isInputFocused: Bool

    var body: some View {
        VStack(spacing: 0) {
            // Messages ScrollView
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 16) {
                        if chatManager.messages.isEmpty {
                            EmptyChatPlaceholder()
                                .frame(maxHeight: .infinity)
                        } else {
                            ForEach(chatManager.messages) { message in
                                MessageBubble(message: message)
                                    .id(message.id)
                            }

                            // Loading indicator
                            if chatManager.isSendingMessage {
                                LoadingBubble()
                            }
                        }
                    }
                    .padding()
                    .padding(.bottom, 20)
                }
                .onAppear {
                    scrollProxy = proxy
                }
                .onChange(of: chatManager.messages.count) { _, _ in
                    scrollToBottom(proxy: proxy)
                }
            }

            // Input Area
            HStack(spacing: 12) {
                TextField("Ask a question...", text: $inputText, axis: .vertical)
                    .foregroundColor(.white)
                    .font(.system(size: 16))
                    .padding(.horizontal, 16)
                    .padding(.vertical, 14)
                    .background(
                        Capsule()
                            .fill(Color(red: 0.11, green: 0.11, blue: 0.12))
                            .shadow(color: Color(red: 0.61, green: 0.42, blue: 1.0).opacity(0.4), radius: 8, x: 0, y: 0)
                    )
                    .focused($isInputFocused)
                    .lineLimit(1...5)
                    .onTapGesture {
                        // Force focus when tapping the text field
                        isInputFocused = true
                    }

                // Debug button - remove this later
                Button("KB") {
                    isInputFocused = true
                }
                .foregroundColor(.blue)

                Button(action: sendMessage) {
                    Image(systemName: "arrow.up.circle.fill")
                        .font(.system(size: 32))
                        .foregroundColor(canSend ? Color(red: 0.43, green: 0.37, blue: 0.99) : .gray)
                }
                .disabled(!canSend)
            }
            .padding(.horizontal)
            .padding(.vertical, 12)
            .background(
                Rectangle()
                    .fill(Color(red: 0.11, green: 0.11, blue: 0.12))
                    .ignoresSafeArea(edges: .bottom)
            )
        }
        .background(Color(red: 0.11, green: 0.11, blue: 0.11)) // ChatGPT-like greyish black
        .onAppear {
            // Fetch initial data if needed
            if chatManager.sessions.isEmpty {
                Task {
                    await chatManager.fetchSessions(for: classManager.activeClass?.id)
                }
            }
        }
    }

    private var canSend: Bool {
        !inputText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !chatManager.isSendingMessage
    }

    private func sendMessage() {
        let message = inputText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !message.isEmpty else { return }

        inputText = ""
        isInputFocused = false

        Task {
            await chatManager.sendMessage(
                query: message,
                classId: classManager.activeClass?.id,
                className: classManager.activeClass?.name,
                domainType: classManager.activeClass?.domainType
            )
            await rewardsManager.trackQuestionAsked()

            // Scroll to bottom after message is sent
            if let proxy = scrollProxy {
                scrollToBottom(proxy: proxy)
            }
        }
    }

    private func scrollToBottom(proxy: ScrollViewProxy) {
        guard let lastMessage = chatManager.messages.last else { return }
        withAnimation {
            proxy.scrollTo(lastMessage.id, anchor: .bottom)
        }
    }
}

// MARK: - Message Bubble

struct MessageBubble: View {
    let message: Message

    private var userGradient: LinearGradient {
        LinearGradient(
            colors: [
                Color(red: 0.43, green: 0.37, blue: 0.99),
                Color(red: 0.62, green: 0.47, blue: 1)
            ],
            startPoint: .leading,
            endPoint: .trailing
        )
    }

    private var assistantGradient: LinearGradient {
        LinearGradient(
            colors: [Color.white.opacity(0.1), Color.white.opacity(0.08)],
            startPoint: .leading,
            endPoint: .trailing
        )
    }

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            if message.role == .user {
                Spacer()
            }

            VStack(alignment: message.role == .user ? .trailing : .leading, spacing: 8) {
                // Message Content
                Text(message.content)
                    .font(.system(size: 16))
                    .foregroundColor(.white)
                    .padding(16)
                    .background(
                        RoundedRectangle(cornerRadius: 20)
                            .fill(message.role == .user ? userGradient : assistantGradient)
                    )
                    .frame(maxWidth: 300, alignment: message.role == .user ? .trailing : .leading)

                // Timestamp
                Text(formatTimestamp(message.timestamp))
                    .font(.system(size: 12))
                    .foregroundColor(.white.opacity(0.5))

                // Citations (for assistant messages only)
                if message.role == .assistant, let citations = message.citations, !citations.isEmpty {
                    CitationsView(citations: citations)
                }
            }

            if message.role == .assistant {
                Spacer()
            }
        }
    }

    private func formatTimestamp(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
}

// MARK: - Citations View

struct CitationsView: View {
    let citations: [Citation]

    @State private var expandedCitation: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Sources")
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(.white.opacity(0.6))

            ForEach(citations) { citation in
                CitationCard(
                    citation: citation,
                    isExpanded: expandedCitation == citation.id,
                    onTap: {
                        withAnimation {
                            expandedCitation = expandedCitation == citation.id ? nil : citation.id
                        }
                        HapticManager.shared.impact(.light)
                    }
                )
            }
        }
        .frame(maxWidth: 300) // Simplified from UIScreen.main.bounds.width * 0.75
    }
}

struct CitationCard: View {
    let citation: Citation
    let isExpanded: Bool
    let onTap: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(citation.source)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(.white)
                        .lineLimit(1)

                    if let page = citation.page {
                        Text("Page \(page)")
                            .font(.system(size: 11))
                            .foregroundColor(.white.opacity(0.6))
                    }
                }

                Spacer()

                // Relevance score
                Text(String(format: "%.0f%%", citation.relevanceScore * 100))
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(.green)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(
                        RoundedRectangle(cornerRadius: 8)
                            .fill(Color.green.opacity(0.2))
                    )

                Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                    .font(.system(size: 12))
                    .foregroundColor(.white.opacity(0.5))
            }

            if isExpanded {
                Text(citation.preview)
                    .font(.system(size: 12))
                    .foregroundColor(.white.opacity(0.8))
                    .padding(.top, 4)
            }
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.white.opacity(0.05))
        )
        .onTapGesture(perform: onTap)
    }
}

// MARK: - Loading Bubble

struct LoadingBubble: View {
    @State private var animationAmount = 0.0

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            HStack(spacing: 6) {
                ForEach(0..<3) { index in
                    Circle()
                        .fill(Color.white.opacity(0.6))
                        .frame(width: 8, height: 8)
                        .scaleEffect(animationAmount == Double(index) ? 1.3 : 1.0)
                        .animation(
                            Animation.easeInOut(duration: 0.6)
                                .repeatForever()
                                .delay(Double(index) * 0.2),
                            value: animationAmount
                        )
                }
            }
            .padding(16)
            .background(
                RoundedRectangle(cornerRadius: 20)
                    .fill(Color.white.opacity(0.1))
            )

            Spacer()
        }
        .onAppear {
            animationAmount = 1.0
        }
    }
}

// MARK: - Empty Chat Placeholder

struct EmptyChatPlaceholder: View {
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "message")
                .font(.system(size: 64))
                .foregroundColor(.white.opacity(0.3))

            VStack(spacing: 8) {
                Text("Start a Conversation")
                    .font(.system(size: 24, weight: .bold))
                    .foregroundColor(.white)

                Text("Ask questions about your documents")
                    .font(.system(size: 16))
                    .foregroundColor(.white.opacity(0.6))
                    .multilineTextAlignment(.center)
            }

            VStack(alignment: .leading, spacing: 12) {
                SuggestionChip(text: "Summarize my documents")
                SuggestionChip(text: "What are the key points?")
                SuggestionChip(text: "Explain this concept")
            }
            .padding(.top, 8)
        }
        .padding()
    }
}

struct SuggestionChip: View {
    let text: String

    var body: some View {
        Text(text)
            .font(.system(size: 14))
            .foregroundColor(.white.opacity(0.8))
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color.white.opacity(0.05))
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(Color.white.opacity(0.1), lineWidth: 1)
                    )
            )
    }
}

#Preview {
    ChatView()
        .environmentObject(ChatManager.shared)
        .environmentObject(ClassManager.shared)
        .environmentObject(RewardsManager.shared)
        .background(Color.black)
}
