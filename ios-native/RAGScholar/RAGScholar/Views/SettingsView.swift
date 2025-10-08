//
//  SettingsView.swift
//  RAGScholar
//
//  Settings view with account, appearance, AI config, timezone, and help
//

import SwiftUI
import FirebaseAuth

struct SettingsView: View {
    @EnvironmentObject var authManager: AuthenticationManager
    @EnvironmentObject var themeManager: ThemeManager
    @Environment(\.colorScheme) var colorScheme
    @Environment(\.dismiss) var dismiss

    @State private var currentView: SettingsScreen = .main
    @State private var isResetPasswordMode = false
    @State private var saveMessage: String?
    @State private var isLoading = false

    // API Settings
    @State private var apiKey: String = ""
    @State private var selectedModel: String = "gpt-5-mini"
    @State private var temperature: Double = 0.0
    @State private var maxTokens: Double = 2000
    @State private var timezone: String = TimeZone.current.identifier

    enum SettingsScreen {
        case main, account, appearance, api, timezone, advanced, help, profile
    }

    var body: some View {
        ZStack {
            backgroundGradient

            VStack(spacing: 0) {
                header

                ScrollView {
                    contentView
                        .padding(.top, currentView != .main ? 40 : 0)
                }
            }
        }
        .onAppear {
            loadTimezone()
            loadAPISettings()
        }
        .onChange(of: apiKey) {
            debounceAPISettingsSave()
        }
        .onChange(of: selectedModel) {
            debounceAPISettingsSave()
        }
        .onChange(of: temperature) {
            debounceAPISettingsSave()
        }
        .onChange(of: maxTokens) {
            debounceAPISettingsSave()
        }
        .onChange(of: timezone) {
            debounceAPISettingsSave()
        }
    }

    @State private var saveWorkItem: DispatchWorkItem?

    private func debounceAPISettingsSave() {
        saveWorkItem?.cancel()
        let workItem = DispatchWorkItem {
            saveAPISettings()
        }
        saveWorkItem = workItem
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0, execute: workItem)
    }

    private var backgroundGradient: some View {
        LinearGradient(
            colors: colorScheme == .dark ? [
                Color(red: 0.11, green: 0.11, blue: 0.11),
                Color(red: 0.08, green: 0.08, blue: 0.08)
            ] : [
                Color.white,
                Color(red: 0.95, green: 0.95, blue: 0.95)
            ],
            startPoint: .top,
            endPoint: .bottom
        )
        .ignoresSafeArea()
    }

    private var header: some View {
        HStack {
            if currentView != .main {
                Button(action: { currentView = .main }) {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 18, weight: .medium))
                        .foregroundColor(colorScheme == .dark ? .white : .black)
                }
                .padding(.leading, 16)

                Text(currentView.title)
                    .font(.system(size: 20, weight: .semibold))
                    .foregroundColor(colorScheme == .dark ? .white : .black)

                Spacer()
            } else {
                Spacer()
            }

            Button(action: { dismiss() }) {
                Image(systemName: "xmark.circle.fill")
                    .font(.system(size: 28))
                    .foregroundColor(.white.opacity(0.6))
            }
            .padding(.trailing, 16)
        }
        .padding(.vertical, 16)
        .background(.ultraThinMaterial)
    }

    @ViewBuilder
    private var contentView: some View {
        switch currentView {
        case .main: mainView
        case .account: accountView
        case .appearance: appearanceView
        case .api: apiView
        case .timezone: timezoneView
        case .advanced: advancedView
        case .help: helpView
        case .profile: profileView
        }
    }

    // MARK: - Main View

    private var mainView: some View {
        VStack(alignment: .leading, spacing: 0) {
            profileSection

            Divider()
                .background(Color.white.opacity(0.1))
                .padding(.horizontal)

            settingsList

            Spacer()

            logoutButton
        }
    }

    private var profileSection: some View {
        Button(action: { currentView = .profile }) {
            HStack(spacing: 16) {
                Circle()
                    .fill(Color.purple.opacity(0.3))
                    .frame(width: 56, height: 56)
                    .overlay(
                        Text(authManager.user?.displayName?.prefix(1).uppercased() ?? "U")
                            .font(.system(size: 24, weight: .semibold))
                            .foregroundColor(.white)
                    )

                VStack(alignment: .leading, spacing: 4) {
                    Text(authManager.user?.displayName ?? authManager.user?.email?.split(separator: "@").first.map(String.init) ?? "User")
                        .font(.system(size: 20, weight: .semibold))
                        .foregroundColor(colorScheme == .dark ? .white : .black)

                    Text("View profile")
                        .font(.system(size: 14))
                        .foregroundColor(.white.opacity(0.6))
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .foregroundColor(.white.opacity(0.4))
            }
            .padding()
            .padding(.top, 8)
        }
    }

    private var settingsList: some View {
        VStack(spacing: 0) {
            settingsRow(icon: "key", title: "Account", action: { currentView = .account })
            settingsRow(icon: "paintpalette", title: "Appearance", action: { currentView = .appearance })
            settingsRow(icon: "cpu", title: "AI Configuration", action: { currentView = .api })
            settingsRow(icon: "clock", title: "Timezone", action: { currentView = .timezone })
            settingsRow(icon: "gearshape", title: "Advanced", action: { currentView = .advanced })
            settingsRow(icon: "questionmark.circle", title: "Help", action: { currentView = .help })
        }
        .padding(.vertical, 8)
    }

    private func settingsRow(icon: String, title: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack {
                Image(systemName: icon)
                    .font(.system(size: 20))
                    .foregroundColor(.white.opacity(0.7))
                    .frame(width: 24)

                Text(title)
                    .font(.system(size: 16))
                    .foregroundColor(colorScheme == .dark ? .white : .black)

                Spacer()

                Image(systemName: "chevron.right")
                    .foregroundColor(.white.opacity(0.4))
            }
            .padding()
            .background(
                RoundedRectangle(cornerRadius: 24)
                    .fill(Color.white.opacity(0.0))
            )
        }
        .padding(.horizontal)
    }

    private var logoutButton: some View {
        Button(action: {
            try? authManager.signOut()
            dismiss()
        }) {
            Text("Log Out")
                .font(.system(size: 16, weight: .bold))
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding()
                .background(
                    LinearGradient(
                        colors: [Color.blue, Color.purple],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .cornerRadius(24)
        }
        .padding()
        .padding(.bottom, 32)
    }

    // MARK: - Account View

    private var accountView: some View {
        VStack(alignment: .leading, spacing: 24) {
            VStack(alignment: .leading, spacing: 8) {
                Text("Email")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(.white.opacity(0.7))

                Text(authManager.user?.email ?? "")
                    .font(.system(size: 16))
                    .foregroundColor(.white.opacity(0.6))
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(
                        RoundedRectangle(cornerRadius: 24)
                            .fill(Color.white.opacity(0.08))
                    )
            }

            if !isResetPasswordMode {
                Button(action: { isResetPasswordMode = true }) {
                    Text("Reset Password")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.purple)
                }
            } else {
                resetPasswordSection
            }

            Spacer()
        }
        .padding()
    }

    private var resetPasswordSection: some View {
        VStack(spacing: 16) {
            Text("Send password reset email to your account")
                .font(.system(size: 14))
                .foregroundColor(.white.opacity(0.6))
                .multilineTextAlignment(.center)

            if let message = saveMessage {
                Text(message)
                    .font(.system(size: 14))
                    .foregroundColor(message.contains("sent") ? .green : .red)
                    .padding()
                    .background(
                        RoundedRectangle(cornerRadius: 16)
                            .fill((message.contains("sent") ? Color.green : Color.red).opacity(0.2))
                    )
            }

            HStack {
                Button(action: sendPasswordReset) {
                    Text(isLoading ? "Sending..." : "Send Reset Email")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.purple)
                        .padding()
                        .background(
                            RoundedRectangle(cornerRadius: 16)
                                .fill(Color.purple.opacity(0.15))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 16)
                                        .stroke(Color.purple.opacity(0.3), lineWidth: 1)
                                )
                        )
                }
                .disabled(isLoading)

                Button(action: {
                    isResetPasswordMode = false
                    saveMessage = nil
                }) {
                    Text("Cancel")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.white)
                        .padding()
                        .background(
                            RoundedRectangle(cornerRadius: 16)
                                .fill(Color.white.opacity(0.1))
                        )
                }
            }
        }
    }

    // MARK: - Appearance View

    private var appearanceView: some View {
        VStack(spacing: 24) {
            themeToggle
            backgroundSelector
            Spacer()
        }
        .padding()
    }

    private var themeToggle: some View {
        HStack {
            Image(systemName: themeManager.isDarkMode ? "moon.fill" : "sun.max.fill")
                .font(.system(size: 20))
                .foregroundColor(themeManager.isDarkMode ? .purple : .orange)

            VStack(alignment: .leading) {
                Text("Theme")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(colorScheme == .dark ? .white : .black)

                Text(themeManager.isDarkMode ? "Dark Mode" : "Light Mode")
                    .font(.system(size: 14))
                    .foregroundColor(.white.opacity(0.6))
            }

            Spacer()

            Toggle("", isOn: $themeManager.isDarkMode)
                .labelsHidden()
                .tint(.purple)
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.white.opacity(0.08))
        )
    }

    private var backgroundSelector: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Background")
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(colorScheme == .dark ? .white : .black)

            LazyVGrid(columns: [GridItem(.adaptive(minimum: 80))], spacing: 12) {
                backgroundOption(id: "classic", name: "Default", color: .gray)
                backgroundOption(id: "gradient", name: "Slate", color: .blue)
                backgroundOption(id: "mountain", name: "Mountain", color: .orange)
                backgroundOption(id: "ocean", name: "Ocean", color: .cyan)
                backgroundOption(id: "sunset", name: "Sunset", color: .pink)
                backgroundOption(id: "forest", name: "Forest", color: .green)
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.white.opacity(0.08))
        )
    }

    private func backgroundOption(id: String, name: String, color: Color) -> some View {
        Button(action: { themeManager.background = id }) {
            Text(name)
                .font(.system(size: 12))
                .foregroundColor(themeManager.background == id ? color : .white.opacity(0.7))
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(
                    RoundedRectangle(cornerRadius: 20)
                        .fill(themeManager.background == id ? color.opacity(0.2) : Color.black.opacity(0.1))
                        .overlay(
                            RoundedRectangle(cornerRadius: 20)
                                .stroke(themeManager.background == id ? color.opacity(0.5) : Color.white.opacity(0.2), lineWidth: 1)
                        )
                )
        }
    }

    // MARK: - API View

    private var apiView: some View {
        VStack(alignment: .leading, spacing: 24) {
            VStack(alignment: .leading, spacing: 8) {
                Text("API Key")
                    .font(.system(size: 14))
                    .foregroundColor(.white.opacity(0.7))

                SecureField("sk-... (OpenAI) | sk-ant-... (Anthropic)", text: $apiKey)
                    .padding()
                    .background(
                        RoundedRectangle(cornerRadius: 24)
                            .fill(Color.white.opacity(0.08))
                    )
                    .foregroundColor(.white)
            }

            secureIntegrationInfo

            Spacer()
        }
        .padding()
    }

    private var secureIntegrationInfo: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: "shield.fill")
                .foregroundColor(.green)

            VStack(alignment: .leading, spacing: 4) {
                Text("Secure Integration")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(.white)

                Text("Your key is encrypted and stored securely in the cloud, providing unlimited usage across all devices")
                    .font(.system(size: 14))
                    .foregroundColor(.white.opacity(0.6))
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.green.opacity(0.15))
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(Color.green.opacity(0.3), lineWidth: 1)
                )
        )
    }

    // MARK: - Timezone View

    private var timezoneView: some View {
        VStack(alignment: .leading, spacing: 24) {
            VStack(alignment: .leading, spacing: 8) {
                Text("Timezone")
                    .font(.system(size: 14))
                    .foregroundColor(.white.opacity(0.7))

                Menu {
                    Button("Auto-detect") { timezone = TimeZone.current.identifier }
                    Button("Eastern Time") { timezone = "America/New_York" }
                    Button("Central Time") { timezone = "America/Chicago" }
                    Button("Mountain Time") { timezone = "America/Denver" }
                    Button("Pacific Time") { timezone = "America/Los_Angeles" }
                    Button("London") { timezone = "Europe/London" }
                    Button("Paris") { timezone = "Europe/Paris" }
                    Button("Tokyo") { timezone = "Asia/Tokyo" }
                } label: {
                    HStack {
                        Text(timezoneLabel)
                            .foregroundColor(.white)
                        Spacer()
                        Image(systemName: "chevron.down")
                            .foregroundColor(.white.opacity(0.5))
                    }
                    .padding()
                    .background(
                        RoundedRectangle(cornerRadius: 24)
                            .fill(Color.white.opacity(0.08))
                    )
                }
            }

            currentTimeInfo

            Spacer()
        }
        .padding()
    }

    private var timezoneLabel: String {
        if timezone == TimeZone.current.identifier { return "Auto-detect" }
        else if timezone == "America/New_York" { return "Eastern Time" }
        else if timezone == "America/Chicago" { return "Central Time" }
        else if timezone == "America/Denver" { return "Mountain Time" }
        else if timezone == "America/Los_Angeles" { return "Pacific Time" }
        else if timezone == "Europe/London" { return "London" }
        else if timezone == "Europe/Paris" { return "Paris" }
        else if timezone == "Asia/Tokyo" { return "Tokyo" }
        return timezone
    }

    private var currentTimeInfo: some View {
        HStack(spacing: 12) {
            Image(systemName: "globe")
                .foregroundColor(.white.opacity(0.6))

            VStack(alignment: .leading, spacing: 4) {
                Text("Current Time")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(.white)

                Text(formattedCurrentTime)
                    .font(.system(size: 14))
                    .foregroundColor(.white.opacity(0.6))
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.white.opacity(0.08))
        )
    }

    private var formattedCurrentTime: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEE, MMM d, h:mm a"
        formatter.timeZone = TimeZone(identifier: timezone)
        return formatter.string(from: Date())
    }

    // MARK: - Advanced View

    private var advancedView: some View {
        VStack(alignment: .leading, spacing: 24) {
            Text("Model Parameters")
                .font(.system(size: 20, weight: .bold))
                .foregroundColor(colorScheme == .dark ? .white : .black)

            VStack(alignment: .leading, spacing: 8) {
                Text("Model")
                    .font(.system(size: 14))
                    .foregroundColor(.white.opacity(0.7))

                Menu {
                    Button("GPT-5") { selectedModel = "gpt-5" }
                    Button("GPT-5 Mini") { selectedModel = "gpt-5-mini" }
                    Button("GPT-5 Nano") { selectedModel = "gpt-5-nano" }
                } label: {
                    HStack {
                        Text(selectedModel)
                            .foregroundColor(.white)
                        Spacer()
                        Image(systemName: "chevron.down")
                            .foregroundColor(.white.opacity(0.5))
                    }
                    .padding()
                    .background(
                        RoundedRectangle(cornerRadius: 24)
                            .fill(Color.white.opacity(0.08))
                    )
                }
            }

            VStack(alignment: .leading, spacing: 8) {
                Text("Temperature (\(String(format: "%.1f", temperature)))")
                    .font(.system(size: 14))
                    .foregroundColor(.white.opacity(0.7))

                Slider(value: $temperature, in: 0...2, step: 0.1)
                    .tint(.purple)

                HStack {
                    Text("Focused")
                        .font(.system(size: 12))
                        .foregroundColor(.white.opacity(0.5))
                    Spacer()
                    Text("Creative")
                        .font(.system(size: 12))
                        .foregroundColor(.white.opacity(0.5))
                }
            }

            VStack(alignment: .leading, spacing: 8) {
                Text("Max Tokens (\(Int(maxTokens)))")
                    .font(.system(size: 14))
                    .foregroundColor(.white.opacity(0.7))

                Slider(value: $maxTokens, in: 100...4000, step: 100)
                    .tint(.purple)

                HStack {
                    Text("100")
                        .font(.system(size: 12))
                        .foregroundColor(.white.opacity(0.5))
                    Spacer()
                    Text("4000")
                        .font(.system(size: 12))
                        .foregroundColor(.white.opacity(0.5))
                }
            }

            Spacer()
        }
        .padding()
    }

    // MARK: - Help View

    private var helpView: some View {
        ScrollView {
            VStack(spacing: 24) {
                gettingStartedSection
                specialCommandsSection
                needHelpSection
            }
            .padding()
        }
    }

    private var gettingStartedSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Getting Started")
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(.white)

            helpStep(number: "1", title: "Upload documents", description: "Add PDFs and text files in the Documents tab", color: .purple)
            helpStep(number: "2", title: "Create classes", description: "Organize documents by subject or project", color: .green)
            helpStep(number: "3", title: "Ask questions", description: "Chat about your content with citations", color: .blue)
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.white.opacity(0.08))
        )
    }

    private func helpStep(number: String, title: String, description: String, color: Color) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Circle()
                .fill(color.opacity(0.2))
                .frame(width: 24, height: 24)
                .overlay(
                    Text(number)
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(color)
                )

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(.white)

                Text(description)
                    .font(.system(size: 14))
                    .foregroundColor(.white.opacity(0.6))
            }
        }
    }

    private var specialCommandsSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Special Commands")
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(.white)

            VStack(alignment: .leading, spacing: 8) {
                commandRow(command: "/background", description: "General knowledge")
                commandRow(command: "/summarize", description: "Summarize documents")
                commandRow(command: "/explain", description: "Simple explanations")
                commandRow(command: "/search", description: "Search documents")
                commandRow(command: "/compare", description: "Compare concepts")
                commandRow(command: "/cite", description: "Find citations")
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.white.opacity(0.08))
        )
    }

    private func commandRow(command: String, description: String) -> some View {
        HStack(spacing: 8) {
            Text(command)
                .font(.system(size: 14, weight: .medium, design: .monospaced))
                .foregroundColor(.purple)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(
                    RoundedRectangle(cornerRadius: 6)
                        .fill(Color.white.opacity(0.1))
                )

            Text(description)
                .font(.system(size: 14))
                .foregroundColor(.white.opacity(0.7))
        }
    }

    private var needHelpSection: some View {
        VStack(spacing: 16) {
            Text("Found a bug or have a suggestion?")
                .font(.system(size: 14))
                .foregroundColor(.white.opacity(0.6))
                .multilineTextAlignment(.center)

            Button(action: { /* TODO: Implement feedback */ }) {
                HStack {
                    Image(systemName: "envelope.fill")
                    Text("Send Feedback")
                        .font(.system(size: 14, weight: .medium))
                }
                .foregroundColor(.purple)
                .padding()
                .background(
                    RoundedRectangle(cornerRadius: 16)
                        .fill(Color.purple.opacity(0.15))
                )
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.white.opacity(0.08))
        )
    }

    // MARK: - Profile View

    private var profileView: some View {
        VStack(spacing: 24) {
            Circle()
                .fill(Color.purple.opacity(0.3))
                .frame(width: 100, height: 100)
                .overlay(
                    Text(authManager.user?.displayName?.prefix(1).uppercased() ?? "U")
                        .font(.system(size: 40, weight: .semibold))
                        .foregroundColor(.white)
                )

            Text(authManager.user?.displayName ?? "User")
                .font(.system(size: 24, weight: .bold))
                .foregroundColor(colorScheme == .dark ? .white : .black)

            Text(authManager.user?.email ?? "")
                .font(.system(size: 16))
                .foregroundColor(.white.opacity(0.6))

            Spacer()
        }
        .padding()
        .padding(.top, 32)
    }

    // MARK: - Helper Functions

    private func loadTimezone() {
        if let saved = UserDefaults.standard.string(forKey: "userTimezone") {
            timezone = saved
        }
    }

    private func loadAPISettings() {
        Task {
            do {
                let settings = try await APIService.shared.getAPISettings()
                apiKey = settings.apiKey ?? ""
                selectedModel = settings.preferredModel ?? "gpt-5-mini"
                temperature = settings.temperature ?? 0.0
                maxTokens = settings.maxTokens.map(Double.init) ?? 2000
                if let tz = settings.timezone {
                    timezone = tz
                }
            } catch {
                print("Failed to load API settings: \(error)")
            }
        }
    }

    private func saveAPISettings() {
        Task {
            do {
                try await APIService.shared.updateAPISettings(
                    apiKey: apiKey.isEmpty ? nil : apiKey,
                    preferredModel: selectedModel,
                    temperature: temperature,
                    maxTokens: Int(maxTokens),
                    timezone: timezone
                )

                // Also save to UserDefaults for offline access
                if !apiKey.isEmpty {
                    UserDefaults.standard.set(apiKey, forKey: "api_key")
                }
                UserDefaults.standard.set(selectedModel, forKey: "preferred_model")
                UserDefaults.standard.set(temperature, forKey: "temperature")
                UserDefaults.standard.set(Int(maxTokens), forKey: "max_tokens")
                UserDefaults.standard.set(timezone, forKey: "userTimezone")

                saveMessage = "Settings saved successfully"
                DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                    saveMessage = nil
                }
            } catch {
                saveMessage = "Failed to save settings"
                DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                    saveMessage = nil
                }
            }
        }
    }

    private func sendPasswordReset() {
        guard let email = authManager.user?.email else { return }

        isLoading = true
        Task {
            do {
                try await authManager.resetPassword(email: email)
                saveMessage = "Password reset email sent! Check your inbox."
                DispatchQueue.main.asyncAfter(deadline: .now() + 5) {
                    saveMessage = nil
                }
            } catch {
                saveMessage = "Failed to send reset email"
                DispatchQueue.main.asyncAfter(deadline: .now() + 5) {
                    saveMessage = nil
                }
            }
            isLoading = false
        }
    }
}

extension SettingsView.SettingsScreen {
    var title: String {
        switch self {
        case .main: return "Settings"
        case .account: return "Account"
        case .appearance: return "Appearance"
        case .api: return "AI Configuration"
        case .timezone: return "Timezone"
        case .advanced: return "Advanced"
        case .help: return "Help"
        case .profile: return "Profile"
        }
    }
}

#Preview {
    SettingsView()
        .environmentObject(AuthenticationManager.shared)
        .environmentObject(ThemeManager.shared)
}
