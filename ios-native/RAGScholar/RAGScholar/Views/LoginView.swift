//
//  LoginView.swift
//  RAGScholar
//
//  Login and authentication view
//

import SwiftUI

struct LoginView: View {
    @Environment(\.colorScheme) var colorScheme
    @State private var isSignUp = false
    @State private var showPassword = false
    @State private var isForgotPassword = false
    @State private var name = ""
    @State private var email = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var successMessage: String?

    @FocusState private var focusedField: Field?

    enum Field {
        case name, email, password
    }

    var body: some View {
        ZStack {
            // Background
            (colorScheme == .dark ? Color(red: 0.11, green: 0.11, blue: 0.12) : Color(red: 0.95, green: 0.95, blue: 0.97))
                .ignoresSafeArea()

            VStack(spacing: 0) {
                Spacer()

                // Login Form
                VStack(spacing: 24) {
                    // Header
                    VStack(spacing: 8) {
                        Text(isForgotPassword ? "Reset Password" : isSignUp ? "Create Account" : "Welcome Back")
                            .font(.system(size: 28, weight: .bold))
                            .foregroundColor(colorScheme == .dark ? .white : .black)

                        Text(isForgotPassword ? "Enter your email to receive a password reset link" : isSignUp ? "Get started with your AI study assistant" : "Sign in to continue your AI-powered study journey")
                            .font(.system(size: 14))
                            .foregroundColor(colorScheme == .dark ? Color.white.opacity(0.6) : Color.black.opacity(0.5))
                            .multilineTextAlignment(.center)
                    }
                    .padding(.bottom, 8)

                    // Name Field (Sign Up only)
                    if isSignUp && !isForgotPassword {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Full Name")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(colorScheme == .dark ? Color.white.opacity(0.8) : Color.black.opacity(0.7))

                            HStack(spacing: 12) {
                                Image(systemName: "person.fill")
                                    .font(.system(size: 16))
                                    .foregroundColor(colorScheme == .dark ? Color.white.opacity(0.4) : Color.black.opacity(0.3))

                                TextField("Enter your full name", text: $name)
                                    .textFieldStyle(.plain)
                                    .font(.system(size: 16))
                                    .foregroundColor(colorScheme == .dark ? .white : .black)
                                    .focused($focusedField, equals: .name)
                                    .textContentType(.name)
                                    .autocapitalization(.words)
                            }
                            .padding(.horizontal, 16)
                            .padding(.vertical, 14)
                            .background(
                                Capsule()
                                    .fill(focusedField == .name ? Color(red: 0.61, green: 0.42, blue: 1.0).opacity(0.1) : (colorScheme == .dark ? Color.white.opacity(0.1) : Color.black.opacity(0.05)))
                                    .overlay(
                                        Capsule()
                                            .stroke(focusedField == .name ? Color(red: 0.61, green: 0.42, blue: 1.0) : Color.clear, lineWidth: 2)
                                    )
                            )
                        }
                    }

                    // Email Field
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Email Address")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.white.opacity(0.8))

                        HStack(spacing: 12) {
                            Image(systemName: "envelope.fill")
                                .font(.system(size: 16))
                                .foregroundColor(.white.opacity(0.4))

                            TextField("Enter your email", text: $email)
                                .textFieldStyle(.plain)
                                .font(.system(size: 16))
                                .foregroundColor(.white)
                                .focused($focusedField, equals: .email)
                                .textContentType(.emailAddress)
                                .keyboardType(.emailAddress)
                                .autocapitalization(.none)
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 14)
                        .background(
                            Capsule()
                                .fill(focusedField == .email ? Color(red: 0.61, green: 0.42, blue: 1.0).opacity(0.1) : Color.white.opacity(0.1))
                                .overlay(
                                    Capsule()
                                        .stroke(focusedField == .email ? Color(red: 0.61, green: 0.42, blue: 1.0) : Color.clear, lineWidth: 2)
                                )
                        )
                    }

                    // Password Field
                    if !isForgotPassword {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Password")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(.white.opacity(0.8))

                            HStack(spacing: 12) {
                                Image(systemName: "lock.fill")
                                    .font(.system(size: 16))
                                    .foregroundColor(.white.opacity(0.4))

                                if showPassword {
                                    TextField("Enter your password", text: $password)
                                        .textFieldStyle(.plain)
                                        .font(.system(size: 16))
                                        .foregroundColor(.white)
                                        .focused($focusedField, equals: .password)
                                        .textContentType(isSignUp ? .newPassword : .password)
                                        .autocapitalization(.none)
                                } else {
                                    SecureField("Enter your password", text: $password)
                                        .textFieldStyle(.plain)
                                        .font(.system(size: 16))
                                        .foregroundColor(.white)
                                        .focused($focusedField, equals: .password)
                                        .textContentType(isSignUp ? .newPassword : .password)
                                        .autocapitalization(.none)
                                }

                                Button {
                                    showPassword.toggle()
                                } label: {
                                    Image(systemName: showPassword ? "eye.slash.fill" : "eye.fill")
                                        .font(.system(size: 16))
                                        .foregroundColor(.white.opacity(0.4))
                                }
                            }
                            .padding(.horizontal, 16)
                            .padding(.vertical, 14)
                            .background(
                                Capsule()
                                    .fill(focusedField == .password ? Color(red: 0.61, green: 0.42, blue: 1.0).opacity(0.1) : Color.white.opacity(0.1))
                                    .overlay(
                                        Capsule()
                                            .stroke(focusedField == .password ? Color(red: 0.61, green: 0.42, blue: 1.0) : Color.clear, lineWidth: 2)
                                    )
                            )

                            if !isSignUp {
                                HStack {
                                    Spacer()
                                    Button {
                                        isForgotPassword = true
                                    } label: {
                                        Text("Forgot your password?")
                                            .font(.system(size: 13))
                                            .foregroundColor(.white.opacity(0.6))
                                    }
                                }
                            }
                        }
                    }

                    // Error/Success Messages
                    if let error = errorMessage {
                        Text(error)
                            .font(.system(size: 13))
                            .foregroundColor(.red.opacity(0.9))
                            .padding(.horizontal, 16)
                            .padding(.vertical, 12)
                            .frame(maxWidth: .infinity)
                            .background(
                                RoundedRectangle(cornerRadius: 12)
                                    .fill(Color.red.opacity(0.2))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 12)
                                            .stroke(Color.red.opacity(0.3), lineWidth: 1)
                                    )
                            )
                    }

                    if let success = successMessage {
                        Text(success)
                            .font(.system(size: 13))
                            .foregroundColor(.green.opacity(0.9))
                            .padding(.horizontal, 16)
                            .padding(.vertical, 12)
                            .frame(maxWidth: .infinity)
                            .background(
                                RoundedRectangle(cornerRadius: 12)
                                    .fill(Color.green.opacity(0.2))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 12)
                                            .stroke(Color.green.opacity(0.3), lineWidth: 1)
                                    )
                            )
                    }

                    // Submit Button
                    Button {
                        handleSubmit()
                    } label: {
                        HStack(spacing: 8) {
                            if isLoading {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                    .scaleEffect(0.8)
                            }
                            Text(isLoading ? (isForgotPassword ? "Sending Reset Email..." : isSignUp ? "Creating Account..." : "Signing In...") : (isForgotPassword ? "Send Reset Email" : isSignUp ? "Create Account" : "Sign In"))
                                .font(.system(size: 16, weight: .semibold))
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(
                            Capsule()
                                .fill(
                                    LinearGradient(
                                        colors: [
                                            Color(red: 0.3, green: 0.6, blue: 1.0),
                                            Color(red: 0.6, green: 0.4, blue: 1.0)
                                        ],
                                        startPoint: .leading,
                                        endPoint: .trailing
                                    )
                                )
                                .shadow(color: Color(red: 0.5, green: 0.5, blue: 1.0).opacity(0.4), radius: 12, x: 0, y: 4)
                        )
                    }
                    .buttonStyle(.plain)
                    .disabled(isLoading)

                    // Toggle Sign Up/Sign In
                    Button {
                        withAnimation {
                            if isForgotPassword {
                                isForgotPassword = false
                                successMessage = nil
                                errorMessage = nil
                            } else {
                                isSignUp.toggle()
                                errorMessage = nil
                                successMessage = nil
                                name = ""
                                email = ""
                                password = ""
                            }
                        }
                    } label: {
                        Text(isForgotPassword ? "Back to sign in" : isSignUp ? "Already have an account? Sign in" : "Need an account? Sign up")
                            .font(.system(size: 13))
                            .foregroundColor(.white.opacity(0.6))
                    }
                }
                .padding(.horizontal, 32)
                .padding(.vertical, 32)

                Spacer()
            }
        }
    }

    private func handleSubmit() {
        errorMessage = nil
        successMessage = nil
        isLoading = true

        // Simulate API call
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
            isLoading = false
            errorMessage = "Authentication not implemented yet"
        }
    }
}

#Preview {
    LoginView()
}
