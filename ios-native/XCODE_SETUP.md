# Setting Up iOS Native App in Xcode

## 🎯 Answer: Keep in Same Repo (Monorepo)

**You do NOT need a separate repo or folder.** Keep everything together:

```
rag_scholar/                    ← Your existing repo
├── .git/                       ← Same git repo
├── backend/                    ← FastAPI
├── frontend/                   ← React web
└── ios-native/                 ← Swift iOS (add Xcode project here)
    ├── RAGScholar/             ← Swift source files (already created)
    ├── RAGScholar.xcodeproj/   ← Will be created by Xcode
    └── .gitignore              ← Already created
```

## 📝 Step-by-Step Xcode Setup

### 1. Open Xcode
```bash
# Launch Xcode (version 15.0 or later)
```

### 2. Create New Project
1. **File** → **New** → **Project**
2. Select **iOS** → **App**
3. Click **Next**

### 3. Configure Project
Fill in these details:

- **Product Name**: `RAGScholar`
- **Team**: Your Apple Developer team (or None for simulator)
- **Organization Identifier**: `com.ragscholar` (or your domain)
- **Bundle Identifier**: Will auto-generate as `com.ragscholar.RAGScholar`
- **Interface**: **SwiftUI** ✅
- **Language**: **Swift** ✅
- **Storage**: None
- **Include Tests**: ✅ (optional)

Click **Next**

### 4. Save Location
**IMPORTANT:** Save in your existing repo:

```
Navigate to: /home/nikolaitennant/projects/rag_scholar/ios-native/

Save As: RAGScholar
```

This will create: `/ios-native/RAGScholar.xcodeproj`

### 5. Import Source Files

Now add all the Swift files we created:

1. **Delete** the default files Xcode created:
   - Delete `ContentView.swift` (we have our own)
   - Delete `RAGScholarApp.swift` (we have our own)

2. **Right-click** the project in navigator
3. Select **Add Files to "RAGScholar"...**
4. Navigate to `ios-native/RAGScholar/`
5. Select **ALL folders**:
   - `App/`
   - `Models/`
   - `ViewModels/`
   - `Views/`
   - `Services/`
   - `Utilities/`

6. **Check these options**:
   - ✅ Copy items if needed
   - ✅ Create groups
   - ✅ Add to target: RAGScholar

7. Click **Add**

### 6. Add Firebase SDK

1. **File** → **Add Package Dependencies**
2. Enter URL: `https://github.com/firebase/firebase-ios-sdk`
3. Click **Add Package**
4. Select these packages:
   - ✅ FirebaseAuth
   - ✅ FirebaseFirestore
   - ✅ FirebaseAnalytics (optional)
5. Click **Add Package**

### 7. Add Firebase Config

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Add iOS app (if not done already)
   - Bundle ID: `com.ragscholar.RAGScholar`
4. Download `GoogleService-Info.plist`
5. Drag `GoogleService-Info.plist` into Xcode project
   - ✅ Copy items if needed
   - ✅ Add to target: RAGScholar

### 8. Configure API URL

Edit `Services/APIService.swift`:

```swift
private init() {
    // For simulator (localhost)
    self.baseURL = "http://localhost:8000"

    // For physical device (use your Mac's IP)
    // self.baseURL = "http://192.168.1.XXX:8000"
}
```

To find your Mac's IP:
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
# Use the IP shown (e.g., 192.168.1.123)
```

### 9. Build & Run

1. Select target: **iPhone 15 Pro** (or your preferred simulator)
2. Press **⌘R** or click ▶️ **Run**
3. App should build and launch! 🎉

## ✅ What You Should See

1. **Splash screen** (if loading)
2. **Login screen** (if not authenticated)
3. **Onboarding** (if no classes)
4. **Main app** with top nav bar and bottom tabs

## 🐛 Troubleshooting

### Build Error: "Cannot find 'FirebaseApp'"
**Fix:** Clean build folder (⌘⇧K) and rebuild

### Build Error: "GoogleService-Info.plist not found"
**Fix:** Make sure file is added to project target

### Runtime Error: "API connection failed"
**Fix:** Check backend is running:
```bash
docker-compose ps
# Should show backend container running
```

### Physical Device: "Cannot connect to localhost"
**Fix:** Use your Mac's local IP in APIService.swift

## 📁 Final Structure

After setup, you'll have:

```
rag_scholar/
└── ios-native/
    ├── RAGScholar.xcodeproj/      ← Xcode project (git tracked)
    ├── RAGScholar.xcworkspace/    ← If using CocoaPods (git tracked)
    ├── .gitignore                 ← Ignores build artifacts
    ├── README.md
    ├── SETUP.md
    └── RAGScholar/                ← Source files
        ├── App/
        ├── Models/
        ├── ViewModels/
        ├── Views/
        ├── Services/
        └── Utilities/
```

## 🎨 Git Status

Git will track:
- ✅ `.xcodeproj/` (Xcode project settings)
- ✅ All `.swift` source files
- ✅ `GoogleService-Info.plist` (or add to .gitignore if sensitive)
- ❌ `DerivedData/` (ignored - build artifacts)
- ❌ `xcuserdata/` (ignored - user-specific)

## 🚀 Next Steps

1. ✅ Verify app builds and runs
2. Test creating a class
3. Test authentication flow
4. Implement remaining views (Chat, Docs, Rewards)
5. Test with physical device
6. Submit to TestFlight

## 💡 Pro Tips

- Use **⌘⇧K** to clean build folder
- Use **⌘B** to build without running
- Use **⌘.** to stop running app
- Use **⌘0** to hide/show navigator
- Use **⌘⌥Enter** to show preview canvas

---

**You're all set! No need for a separate repo - everything works great in your monorepo.** 🎉
