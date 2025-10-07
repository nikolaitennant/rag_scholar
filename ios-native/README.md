# RAG Scholar - Native iOS App

A fully native Swift/SwiftUI iOS application for RAG Scholar, featuring liquid glass UI, native animations, haptic feedback, and seamless integration with the FastAPI backend.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│         Shared Backend Layer (FastAPI)          │
│─────────────────────────────────────────────────│
│  • FastAPI REST API                             │
│  • Firebase Authentication                      │
│  • Firestore Database                           │
│  • RAG Pipeline (LangChain + Vector Search)     │
│  • Document Processing                          │
└────────────────┬────────────────────────────────┘
                 │
                 │ JSON REST API
                 │
    ┌────────────┴────────────┐
    │                         │
┌───▼──────────┐      ┌──────▼──────────┐
│ iOS Native   │      │  Web Frontend   │
│ Swift/SwiftUI│      │  React + Next.js│
├──────────────┤      ├─────────────────┤
│• Native UI   │      │• Responsive Web │
│• Haptics     │      │• PWA Support    │
│• Animations  │      │• Desktop First  │
│• Face ID     │      │• Accessibility  │
│• Widgets     │      │                 │
└──────────────┘      └─────────────────┘
```

## 📱 Features

### Core Features
- ✅ **Native iOS UI** - Built with SwiftUI, featuring iOS 17+ design patterns
- ✅ **Liquid Glass Effects** - Ultrathincorona material with blur and vibrancy
- ✅ **Haptic Feedback** - Rich haptic responses throughout the app
- ✅ **Smooth Animations** - 60fps native animations with spring physics
- ✅ **Dark Mode Only** - Beautiful dark interface optimized for OLED

### Navigation
- ✅ **Persistent Top Bar** - Always-visible navigation with class switcher
- ✅ **Slack-Style Class Switcher** - Modal sheet for quick class changes
- ✅ **Custom Tab Bar** - Native iOS tab bar with glassmorphism
- ✅ **Global Search** - Search across chats and documents

### Authentication
- ✅ **Firebase Auth** - Secure authentication with email/password
- 🔄 **Face ID / Touch ID** - Biometric authentication (planned)
- 🔄 **Sign in with Apple** - Native Apple authentication (planned)

### Class Management
- ✅ **Create/Edit/Delete Classes** - Full class CRUD operations
- ✅ **Domain Types** - 9 domain types with custom icons and colors
- ✅ **Active Class Persistence** - Auto-save and restore active class
- ✅ **Auto-Selection** - Smart class selection on app launch

### Chat
- 🔄 **Real-time Chat** - Chat with AI using RAG context
- 🔄 **Citations** - View source citations for AI responses
- 🔄 **Session Management** - Save and restore chat sessions
- 🔄 **Message History** - Full conversation history

### Documents
- 🔄 **Upload Documents** - Upload PDFs, DOCs, and more
- 🔄 **Document Viewer** - Native document preview
- 🔄 **Class Assignment** - Assign documents to classes
- 🔄 **Document Search** - Search within documents

## 📂 Project Structure

```
ios-native/
└── RAGScholar/
    ├── App/
    │   ├── RAGScholarApp.swift          # App entry point
    │   └── ContentView.swift            # Root view router
    │
    ├── Models/
    │   ├── UserClass.swift              # Class model with DomainType enum
    │   ├── Message.swift                # Chat message and session models
    │   └── Document.swift               # Document model
    │
    ├── ViewModels/
    │   ├── AuthenticationManager.swift  # Firebase auth manager
    │   ├── ClassManager.swift           # Class state management
    │   └── NavigationManager.swift      # Navigation state
    │
    ├── Views/
    │   ├── MainTabView.swift            # Main tab container
    │   ├── TopNavigationBar.swift       # Persistent top bar
    │   ├── ClassSwitcherView.swift      # Class selector modal
    │   ├── HomeView.swift               # Home screen
    │   ├── ChatView.swift               # Chat interface
    │   ├── DocumentsView.swift          # Document library
    │   ├── RewardsView.swift            # Achievements & rewards
    │   ├── LoginView.swift              # Authentication screen
    │   ├── SplashScreenView.swift       # Loading screen
    │   ├── ClassOnboardingView.swift    # First-time onboarding
    │   └── GlobalSearchView.swift       # Search overlay
    │
    ├── Services/
    │   └── APIService.swift             # FastAPI client
    │
    ├── Utilities/
    │   └── HapticManager.swift          # Haptic feedback manager
    │
    ├── Extensions/
    │   └── (Color, View, etc.)
    │
    └── Resources/
        └── (Assets, Fonts, etc.)
```

## 🚀 Getting Started

### Prerequisites

- **Xcode 15.0+** (for iOS 17+ development)
- **macOS Sonoma 14.0+** (recommended)
- **iOS 17.0+** device or simulator
- **Firebase project** with iOS app registered
- **Running FastAPI backend** (see `../backend/README.md`)

### Setup Instructions

#### 1. Clone and Navigate

```bash
cd ios-native/RAGScholar
```

#### 2. Configure Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your RAG Scholar project
3. Add an iOS app:
   - Bundle ID: `com.ragscholar.ios` (or your custom bundle ID)
   - Download `GoogleService-Info.plist`
4. Place `GoogleService-Info.plist` in `ios-native/RAGScholar/Resources/`

#### 3. Install Firebase SDK

Add Firebase SDK via Swift Package Manager:

1. Open Xcode
2. File → Add Package Dependencies
3. Enter: `https://github.com/firebase/firebase-ios-sdk`
4. Select packages:
   - FirebaseAuth
   - FirebaseFirestore
   - FirebaseAnalytics (optional)

#### 4. Configure Backend URL

Edit `ios-native/RAGScholar/Services/APIService.swift`:

```swift
private init() {
    // Development
    self.baseURL = "http://localhost:8000"

    // Production
    // self.baseURL = "https://your-api.com"
}
```

For physical device testing, use your computer's local IP:
```swift
self.baseURL = "http://192.168.1.xxx:8000"
```

#### 5. Build and Run

1. Open `RAGScholar.xcodeproj` in Xcode
2. Select your target device/simulator
3. Press ⌘R to build and run

## 🎨 Design System

### Colors

```swift
// Background Gradients
LinearGradient(
    colors: [
        Color(red: 0.1, green: 0.1, blue: 0.18),  // #1A1A2E
        Color(red: 0.09, green: 0.13, blue: 0.25), // #16213E
        Color(red: 0.06, green: 0.2, blue: 0.38)   // #0F3460
    ],
    startPoint: .topLeading,
    endPoint: .bottomTrailing
)

// Accent Purple
Color(red: 0.43, green: 0.37, blue: 0.99) // #6D5FFD
Color(red: 0.62, green: 0.47, blue: 1)    // #9E78FF

// Glass Materials
.ultraThinMaterial.opacity(0.8)
Color.white.opacity(0.1)
```

### Typography

```swift
.font(.largeTitle)      // 34pt, Bold
.font(.title)           // 28pt, Semibold
.font(.headline)        // 17pt, Semibold
.font(.body)            // 17pt, Regular
.font(.subheadline)     // 15pt, Regular
.font(.caption)         // 12pt, Regular
```

### Haptics

```swift
// Use HapticManager for consistent feedback
HapticManager.shared.selection()      // Tab switches, picker changes
HapticManager.shared.impact(.light)   // Button taps
HapticManager.shared.impact(.medium)  // Card taps, toggles
HapticManager.shared.success()        // Successful operations
HapticManager.shared.error()          // Failed operations
```

## 🔌 API Integration

### Authentication Flow

```swift
// Sign In
try await AuthenticationManager.shared.signIn(
    email: "user@example.com",
    password: "password"
)

// Sign Up
try await AuthenticationManager.shared.signUp(
    email: "user@example.com",
    password: "password",
    displayName: "John Doe"
)

// Sign Out
try AuthenticationManager.shared.signOut()
```

### Class Management

```swift
// Fetch Classes
await ClassManager.shared.fetchClasses()

// Create Class
await ClassManager.shared.createClass(
    name: "Biology 101",
    domainType: .science,
    description: "Introduction to Biology"
)

// Select Class
ClassManager.shared.selectClass(someClass)
```

### Chat

```swift
// Send Message
let response = try await APIService.shared.sendMessage(
    query: "What is photosynthesis?",
    sessionId: currentSessionId,
    classId: activeClass?.id,
    className: activeClass?.name,
    domainType: activeClass?.domainType
)
```

## 🧪 Testing

### Unit Tests
```bash
⌘U in Xcode
```

### UI Tests
```bash
⌘U with UI Testing scheme
```

### Manual Testing Checklist
- [ ] Authentication (sign in, sign up, sign out)
- [ ] Class creation, editing, deletion
- [ ] Class switching with haptics
- [ ] Tab navigation
- [ ] Global search
- [ ] Chat interface
- [ ] Document upload and viewing

## 📦 Dependencies

### Swift Packages
- **Firebase iOS SDK** (Auth, Firestore)
  - `https://github.com/firebase/firebase-ios-sdk`

### System Frameworks
- SwiftUI
- Combine
- UIKit (for haptics)

## 🚢 Deployment

### TestFlight
1. Archive app (Product → Archive)
2. Distribute → TestFlight
3. Upload to App Store Connect
4. Add testers and release

### App Store
1. Prepare App Store listing
2. Submit for review
3. Release after approval

## 🔐 Environment Variables

Create `Config.xcconfig`:

```
API_BASE_URL = http:\/\/localhost:8000
FIREBASE_PROJECT_ID = your-project-id
```

## 📝 TODO

- [ ] Implement ChatView with message sending
- [ ] Implement DocumentsView with upload
- [ ] Implement RewardsView with achievements
- [ ] Add Face ID / Touch ID authentication
- [ ] Implement WidgetKit extensions
- [ ] Add Live Activities for chat
- [ ] Implement ShareSheet for documents
- [ ] Add Siri Shortcuts integration
- [ ] Implement offline mode with CoreData
- [ ] Add push notifications

## 🤝 Contributing

1. Create feature branch
2. Implement changes with tests
3. Submit pull request
4. Code review and merge

## 📄 License

See `../LICENSE`

## 🆘 Support

- Issues: [GitHub Issues](https://github.com/yourusername/rag-scholar/issues)
- Docs: [Documentation](https://docs.ragscholar.com)

---

**Made with ❤️ using Swift & SwiftUI**
