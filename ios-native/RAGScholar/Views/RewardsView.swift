//
//  RewardsView.swift
//  RAGScholar
//
//  Rewards and achievements view
//

import SwiftUI

struct RewardsView: View {
    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            VStack {
                Text("RewardsView")
                    .font(.title)
                    .foregroundColor(.white)
                Text("Coming soon...")
                    .foregroundColor(.white.opacity(0.6))
            }
        }
    }
}

#Preview {
    RewardsView()
}
