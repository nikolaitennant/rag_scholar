//
//  PreviewData.swift
//  RAGScholar
//
//  Mock data for Xcode previews and canvas
//

import Foundation

extension UserClass {
    static let mockClasses: [UserClass] = [
        UserClass(
            id: "1",
            name: "Introduction to Psychology",
            domainType: .science,
            description: "Study of human behavior and mental processes",
            documents: ["doc1", "doc2"],
            createdAt: "2024-01-15T10:00:00Z",
            updatedAt: "2024-01-20T15:30:00Z"
        ),
        UserClass(
            id: "2",
            name: "Constitutional Law",
            domainType: .law,
            description: "Analysis of constitutional principles and case law",
            documents: ["doc3"],
            createdAt: "2024-01-10T09:00:00Z",
            updatedAt: "2024-01-25T14:00:00Z"
        ),
        UserClass(
            id: "3",
            name: "Ancient Roman History",
            domainType: .history,
            description: "From the founding of Rome to the fall of the Western Empire",
            documents: ["doc4", "doc5"],
            createdAt: "2024-01-05T11:00:00Z",
            updatedAt: "2024-01-22T16:00:00Z"
        ),
        UserClass(
            id: "4",
            name: "Organic Chemistry II",
            domainType: .science,
            description: "Advanced organic chemistry reactions and mechanisms",
            documents: [],
            createdAt: "2024-02-01T08:00:00Z",
            updatedAt: "2024-02-01T08:00:00Z"
        ),
        UserClass(
            id: "5",
            name: "Business Strategy",
            domainType: .business,
            description: "Strategic management and competitive analysis",
            documents: ["doc6"],
            createdAt: "2024-01-18T13:00:00Z",
            updatedAt: "2024-01-28T10:00:00Z"
        )
    ]
}

extension Document {
    static let mockDocuments: [Document] = [
        Document(
            id: "doc1",
            filename: "Cognitive Psychology Chapter 3.pdf",
            fileType: "pdf",
            chunks: 45,
            uploadDate: "2 days ago",
            assignedClasses: ["1"],
            collection: "database"
        ),
        Document(
            id: "doc2",
            filename: "Research Methods in Psychology.docx",
            fileType: "docx",
            chunks: 32,
            uploadDate: "1 week ago",
            assignedClasses: ["1"],
            collection: "database"
        ),
        Document(
            id: "doc3",
            filename: "Supreme Court Cases 2023.pdf",
            fileType: "pdf",
            chunks: 78,
            uploadDate: "3 days ago",
            assignedClasses: ["2"],
            collection: "database"
        ),
        Document(
            id: "doc4",
            filename: "The Roman Republic.txt",
            fileType: "txt",
            chunks: 23,
            uploadDate: "5 days ago",
            assignedClasses: ["3"],
            collection: "database"
        ),
        Document(
            id: "doc5",
            filename: "Julius Caesar Biography.pdf",
            fileType: "pdf",
            chunks: 56,
            uploadDate: "1 week ago",
            assignedClasses: ["3"],
            collection: "database"
        ),
        Document(
            id: "doc6",
            filename: "Porter's Five Forces Analysis.md",
            fileType: "md",
            chunks: 18,
            uploadDate: "4 days ago",
            assignedClasses: ["5"],
            collection: "database"
        ),
        Document(
            id: "doc7",
            filename: "Introduction to Machine Learning.pdf",
            fileType: "pdf",
            chunks: 92,
            uploadDate: "2 weeks ago",
            assignedClasses: nil,
            collection: "database"
        ),
        Document(
            id: "doc8",
            filename: "Shakespeare Complete Works.pdf",
            fileType: "pdf",
            chunks: 234,
            uploadDate: "3 weeks ago",
            assignedClasses: nil,
            collection: "database"
        )
    ]
}

extension ChatSession {
    static let mockSessions: [ChatSession] = [
        ChatSession(
            id: "session1",
            name: "Understanding Cognitive Biases",
            messageCount: 12,
            createdAt: "2024-02-10T14:30:00Z",
            updatedAt: "2024-02-10T15:45:00Z",
            classId: "1",
            preview: "Can you explain what cognitive biases are?",
            className: "Introduction to Psychology",
            domain: "Science"
        ),
        ChatSession(
            id: "session2",
            name: "Constitutional Rights Overview",
            messageCount: 8,
            createdAt: "2024-02-09T10:00:00Z",
            updatedAt: "2024-02-09T11:20:00Z",
            classId: "2",
            preview: "What are the key constitutional rights?",
            className: "Constitutional Law",
            domain: "Law"
        ),
        ChatSession(
            id: "session3",
            name: "Fall of the Roman Empire",
            messageCount: 15,
            createdAt: "2024-02-08T16:00:00Z",
            updatedAt: "2024-02-08T17:30:00Z",
            classId: "3",
            preview: "What caused the fall of Rome?",
            className: "Ancient Roman History",
            domain: "History"
        ),
        ChatSession(
            id: "session4",
            name: "Reaction Mechanisms Study",
            messageCount: 6,
            createdAt: "2024-02-07T09:00:00Z",
            updatedAt: "2024-02-07T09:45:00Z",
            classId: "4",
            preview: "Explain SN1 vs SN2 reactions",
            className: "Organic Chemistry II",
            domain: "Science"
        ),
        ChatSession(
            id: "session5",
            name: "SWOT Analysis Discussion",
            messageCount: 10,
            createdAt: "2024-02-06T13:00:00Z",
            updatedAt: "2024-02-06T14:15:00Z",
            classId: "5",
            preview: "How do I conduct a SWOT analysis?",
            className: "Business Strategy",
            domain: "Business"
        ),
        ChatSession(
            id: "session6",
            name: "Memory and Learning",
            messageCount: 7,
            createdAt: "2024-02-05T11:00:00Z",
            updatedAt: "2024-02-05T12:00:00Z",
            classId: "1",
            preview: "How does memory formation work?",
            className: "Introduction to Psychology",
            domain: "Science"
        ),
        ChatSession(
            id: "session7",
            name: "First Amendment Cases",
            messageCount: 9,
            createdAt: "2024-02-04T15:00:00Z",
            updatedAt: "2024-02-04T16:00:00Z",
            classId: "2",
            preview: "Key First Amendment precedents?",
            className: "Constitutional Law",
            domain: "Law"
        )
    ]
}

extension Message {
    static let mockMessages: [Message] = [
        Message(
            role: .user,
            content: "Can you explain what cognitive biases are?",
            timestamp: "2024-02-10T14:30:00Z",
            citations: nil
        ),
        Message(
            role: .assistant,
            content: "Cognitive biases are systematic patterns of deviation from rational judgment. They occur when people process and interpret information in the world around them, affecting the decisions and judgments that they make. Common examples include confirmation bias (favoring information that confirms existing beliefs) and anchoring bias (relying too heavily on the first piece of information encountered).",
            timestamp: "2024-02-10T14:31:00Z",
            citations: [
                Citation(
                    id: "cite1",
                    source: "Cognitive Psychology Chapter 3.pdf",
                    page: 45,
                    preview: "Cognitive biases are systematic errors in thinking that affect decisions and judgments...",
                    relevanceScore: 0.92
                )
            ]
        ),
        Message(
            role: .user,
            content: "What are some strategies to overcome these biases?",
            timestamp: "2024-02-10T14:35:00Z",
            citations: nil
        ),
        Message(
            role: .assistant,
            content: "Several strategies can help mitigate cognitive biases:\n\n1. **Awareness**: Simply being aware of common biases can help you recognize when they might be influencing your thinking.\n\n2. **Seek diverse perspectives**: Actively look for information that challenges your assumptions.\n\n3. **Use systematic decision-making processes**: Structured approaches like pros-and-cons lists can reduce bias.\n\n4. **Take time**: Avoid rushed decisions when possible, as quick thinking often amplifies biases.\n\n5. **Consider the opposite**: Deliberately think about why your initial judgment might be wrong.",
            timestamp: "2024-02-10T14:36:00Z",
            citations: [
                Citation(
                    id: "cite2",
                    source: "Cognitive Psychology Chapter 3.pdf",
                    page: 52,
                    preview: "Strategies for overcoming cognitive biases include awareness training, seeking contradictory evidence...",
                    relevanceScore: 0.88
                )
            ]
        )
    ]
}

// Preview-only manager extensions with mock data
#if DEBUG
extension ClassManager {
    @MainActor
    static var preview: ClassManager {
        let manager = ClassManager.shared
        manager.classes = UserClass.mockClasses
        manager.activeClass = UserClass.mockClasses.first
        return manager
    }
}

extension DocumentManager {
    @MainActor
    static var preview: DocumentManager {
        let manager = DocumentManager.shared
        manager.documents = Document.mockDocuments
        return manager
    }
}

extension ChatManager {
    @MainActor
    static var preview: ChatManager {
        let manager = ChatManager.shared
        manager.sessions = ChatSession.mockSessions
        manager.messages = Message.mockMessages
        manager.currentSession = ChatSession.mockSessions.first
        return manager
    }
}

extension RewardsManager {
    @MainActor
    static var preview: RewardsManager {
        let manager = RewardsManager.shared
        manager.achievements = Achievement.defaultAchievements
        manager.userStats = UserStats(
            totalPoints: 245,
            achievementsUnlocked: 4,
            totalAchievements: 10,
            chatsCreated: 12,
            documentsUploaded: 8,
            questionsAsked: 47,
            totalPossiblePoints: 530
        )
        return manager
    }
}
#endif
