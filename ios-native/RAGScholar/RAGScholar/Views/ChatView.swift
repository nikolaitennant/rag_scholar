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
    @EnvironmentObject var navigationManager: NavigationManager
    @Environment(\.colorScheme) var colorScheme

    @State private var inputText: String = ""
    @State private var scrollProxy: ScrollViewProxy?
    @FocusState private var isInputFocused: Bool

    var body: some View {
        VStack(spacing: 0) {
            // Messages ScrollView
            ScrollViewReader { proxy in
                GeometryReader { geometry in
                    ZStack {
                        ScrollView {
                            LazyVStack(spacing: 16) {
                                if chatManager.messages.isEmpty {
                                    // Spacer to push content down
                                    Color.clear
                                        .frame(height: geometry.size.height * 0.35)
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
                        .simultaneousGesture(
                            DragGesture()
                                .onChanged { gesture in
                                    if gesture.translation.height > 50 {
                                        isInputFocused = false
                                    }
                                }
                        )
                        .onAppear {
                            scrollProxy = proxy
                        }
                        .onChange(of: chatManager.messages.count) { _, _ in
                            scrollToBottom(proxy: proxy)
                        }

                        // Welcome message centered
                        if chatManager.messages.isEmpty {
                            VStack {
                                Spacer()
                                EmptyChatPlaceholder()
                                    .opacity(inputText.isEmpty ? 1.0 : 0.0)
                                    .animation(.easeInOut(duration: 0.3), value: inputText.isEmpty)
                                Spacer()
                            }
                            .allowsHitTesting(false)
                        }
                    }
                }
            }

            // Input Area with Glass Effect
            GlassEffectContainer(spacing: 8) {
                VStack(spacing: 0) {
                    HStack(alignment: .center, spacing: 0) {
                        TextField("Ask a question...", text: $inputText, axis: .vertical)
                            .foregroundColor(colorScheme == .dark ? .white : .black)
                            .font(.system(size: 16))
                            .focused($isInputFocused)
                            .lineLimit(1...5)
                            .frame(maxWidth: .infinity)
                            .padding(.leading, 16)
                            .padding(.vertical, 10)

                        Button(action: sendMessage) {
                            Image(systemName: "arrow.up.circle.fill")
                                .font(.system(size: 26))
                                .foregroundColor(canSend ? Color(red: 0.61, green: 0.42, blue: 1.0) : Color.gray.opacity(0.3))
                        }
                        .disabled(!canSend)
                        .padding(.trailing, 12)
                        .padding(.vertical, 10)
                    }
                    .glassEffect(in: Capsule())
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .shadow(color: Color(red: 0.61, green: 0.42, blue: 1.0).opacity(0.4), radius: 8, x: 0, y: 0)
                }
                .background(
                    Rectangle()
                        .fill(colorScheme == .dark ? Color(red: 0.11, green: 0.11, blue: 0.12) : Color.white)
                        .ignoresSafeArea(edges: .bottom)
                )
            }
        }
        .background(colorScheme == .dark ? Color(red: 0.11, green: 0.11, blue: 0.11) : Color.white)
        .toolbar(isInputFocused ? .hidden : .visible, for: .tabBar)
        .onAppear {
            // Fetch initial data if needed
            if chatManager.sessions.isEmpty {
                Task {
                    await chatManager.fetchSessions(for: classManager.activeClass?.id)
                }
            }
        }
        .toolbarBackground(colorScheme == .dark ? Color(red: 0.11, green: 0.11, blue: 0.11) : .white, for: .navigationBar)
        .toolbarBackground(.visible, for: .navigationBar)
        .toolbarColorScheme(colorScheme == .dark ? .dark : .light, for: .navigationBar)
        .toolbar {
            // Leading - Class dropdown
            ToolbarItem(placement: .topBarLeading) {
                Menu {
                    ForEach(classManager.classes) { userClass in
                        Button(action: {
                            classManager.selectClass(userClass)
                        }) {
                            HStack {
                                Text(userClass.name)
                                if classManager.activeClass?.id == userClass.id {
                                    Image(systemName: "checkmark")
                                }
                            }
                        }
                    }

                    Divider()

                    Button(action: {
                        navigationManager.selectedTab = .classes
                    }) {
                        Label("Manage Classes", systemImage: "folder.badge.gearshape")
                    }
                } label: {
                    HStack(spacing: 4) {
                        Text(classManager.activeClass?.name ?? "Select Class")
                            .font(.system(size: 15))
                            .foregroundColor(colorScheme == .dark ? .white : .black)
                            .lineLimit(1)
                        Image(systemName: "chevron.down")
                            .font(.system(size: 12))
                            .foregroundColor(colorScheme == .dark ? .white : .black)
                    }
                }
            }

            // Trailing - New Chat button
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    Task {
                        await chatManager.startNewSession()
                        HapticManager.shared.impact(.medium)
                    }
                } label: {
                    Image(systemName: "square.and.pencil")
                        .font(.system(size: 16))
                        .foregroundColor(colorScheme == .dark ? .white : .black)
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
    @Environment(\.colorScheme) var colorScheme

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
            colors: colorScheme == .dark ?
                [Color.white.opacity(0.1), Color.white.opacity(0.08)] :
                [Color(red: 0.95, green: 0.95, blue: 0.97), Color(red: 0.93, green: 0.93, blue: 0.95)],
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
                    .foregroundColor(message.role == .user ? .white : (colorScheme == .dark ? .white : .black))
                    .padding(16)
                    .background(
                        RoundedRectangle(cornerRadius: 20)
                            .fill(message.role == .user ? userGradient : assistantGradient)
                    )
                    .frame(maxWidth: 300, alignment: message.role == .user ? .trailing : .leading)

                // Timestamp
                if let timestamp = message.timestamp {
                    Text(timestamp)
                        .font(.system(size: 12))
                        .foregroundColor(colorScheme == .dark ? .white.opacity(0.5) : .black.opacity(0.5))
                }

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
    @Environment(\.colorScheme) var colorScheme

    var body: some View {
        Text("Welcome to RAG Scholar")
            .font(.system(size: 24, weight: .bold))
            .foregroundColor(colorScheme == .dark ? .white : .black)
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
