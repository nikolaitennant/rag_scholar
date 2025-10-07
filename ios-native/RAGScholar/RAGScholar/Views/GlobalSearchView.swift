//
//  GlobalSearchView.swift
//  RAGScholar
//
//  Global search overlay
//

import SwiftUI

struct GlobalSearchView: View {
    @Environment(\.dismiss) var dismiss
    @State private var searchText = ""

    var body: some View {
        NavigationStack {
            ZStack {
                Color(red: 0.11, green: 0.11, blue: 0.12)
                    .ignoresSafeArea()

                VStack {
                    if searchText.isEmpty {
                        VStack(spacing: 16) {
                            Image(systemName: "magnifyingglass")
                                .font(.system(size: 60))
                                .foregroundColor(.white.opacity(0.3))

                            Text("Search for chats and documents")
                                .foregroundColor(.white.opacity(0.6))
                        }
                    } else {
                        Text("Search results for: \(searchText)")
                            .foregroundColor(.white)
                    }
                }
            }
            .navigationTitle("Search")
            .navigationBarTitleDisplayMode(.large)
            .searchable(text: $searchText, prompt: "Search chats and documents")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                    .foregroundColor(.white)
                }
            }
        }
        .preferredColorScheme(.dark)
    }
}

#Preview {
    GlobalSearchView()
}
