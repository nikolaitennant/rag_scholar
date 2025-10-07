# Migration Guide: Capacitor → Native Swift

## Current Structure

```
rag_scholar/
├── frontend/                    # React web app
│   ├── ios/                    # ❌ Capacitor wrapper (hybrid) - TO BE DEPRECATED
│   └── src/                    # React source code
│
├── ios-native/                  # ✅ NEW Native Swift/SwiftUI app
│   └── RAGScholar/
│
└── backend/                     # FastAPI backend (shared)
```

## Recommended Approach

### Phase 1: Parallel Development (Current)
- Keep Capacitor wrapper for testing
- Develop native Swift app in parallel
- Both apps talk to the same backend

### Phase 2: Native App Ready
- Complete native Swift app features
- Submit to TestFlight for beta testing
- Gather feedback and iterate

### Phase 3: Deprecate Capacitor (Future)
- Remove `frontend/ios/` directory
- Update build scripts
- Native app becomes the official iOS app

## What to Do Now

### For Web Development
```bash
cd frontend/
npm run start    # Develop web app
```

### For Native iOS Development
```bash
open ios-native/RAGScholar.xcodeproj    # Open in Xcode
```

### Remove Capacitor iOS (Optional)
If you want to clean up:
```bash
# Remove Capacitor iOS wrapper
rm -rf frontend/ios/

# Remove Capacitor dependencies
cd frontend/
npm uninstall @capacitor/ios @capacitor/core @capacitor/cli
```

## Key Differences

| Feature | Capacitor (Old) | Native Swift (New) |
|---------|----------------|-------------------|
| UI | React wrapped in WebView | Native SwiftUI |
| Performance | Web performance | Native 60fps |
| Animations | CSS animations | Native Core Animation |
| Haptics | Basic via plugin | Rich UIFeedbackGenerator |
| Face ID | Plugin required | Native LocalAuthentication |
| Widgets | Not supported | WidgetKit |
| App Store | Hybrid app | True native app |
| Code sharing | HTML/CSS/JS | None with web |

## Benefits of Native Swift

✅ **Better Performance** - Native code runs faster than WebView
✅ **Native Feel** - Uses iOS native components and patterns
✅ **Haptic Feedback** - Rich haptic feedback throughout
✅ **Face ID** - Native biometric authentication
✅ **Widgets** - HomeScreen and LockScreen widgets
✅ **Live Activities** - Dynamic Island integration
✅ **Better App Store Presence** - Seen as true iOS app
✅ **Offline Capabilities** - CoreData integration
✅ **ShareSheet** - Native sharing
✅ **Siri Shortcuts** - Voice command integration

## Next Steps

1. ✅ Native app structure created
2. ⏳ Implement remaining views (Chat, Docs, Rewards)
3. ⏳ Test with backend API
4. ⏳ Beta test via TestFlight
5. ⏳ Submit to App Store
6. ⏳ Remove Capacitor wrapper

---

**Recommendation:** Keep both for now, focus on completing the native app, then deprecate Capacitor.
