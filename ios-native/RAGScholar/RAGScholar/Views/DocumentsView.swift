//
//  DocumentsView.swift
//  RAGScholar
//
//  Documents library view
//

import SwiftUI

struct DocumentsView: View {
    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            VStack {
                Text("DocumentsView")
                    .font(.title)
                    .foregroundColor(.white)
                Text("Coming soon...")
                    .foregroundColor(.white.opacity(0.6))
            }
        }
    }
}

#Preview {
    DocumentsView()
}
