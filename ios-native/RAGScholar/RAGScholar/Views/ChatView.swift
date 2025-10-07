//
//  ChatView.swift
//  RAGScholar
//
//  Chat interface view
//

import SwiftUI

struct ChatView: View {
    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            VStack {
                Text("ChatView")
                    .font(.title)
                    .foregroundColor(.white)
                Text("Coming soon...")
                    .foregroundColor(.white.opacity(0.6))
            }
        }
    }
}

#Preview {
    ChatView()
}
