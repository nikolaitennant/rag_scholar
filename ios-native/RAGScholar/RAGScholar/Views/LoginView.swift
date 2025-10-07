//
//  LoginView.swift
//  RAGScholar
//
//  Login and authentication view
//

import SwiftUI

struct LoginView: View {
    var body: some View {
        ZStack {
            // Background gradient
            LinearGradient(
                colors: [
                    Color(red: 0.1, green: 0.1, blue: 0.18),
                    Color(red: 0.09, green: 0.13, blue: 0.25),
                    Color(red: 0.06, green: 0.2, blue: 0.38)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            VStack {
                Text("LoginView")
                    .font(.title)
                    .foregroundColor(.white)
                Text("Coming soon...")
                    .foregroundColor(.white.opacity(0.6))
            }
        }
    }
}

#Preview {
    LoginView()
}
