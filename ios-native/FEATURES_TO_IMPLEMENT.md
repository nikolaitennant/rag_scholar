# Features to Implement from React Mobile App

## ✅ Already Implemented (Foundation)
- [x] Top navigation bar with class switcher, search, settings
- [x] Bottom tab bar (Home, Chat, Docs, Rewards)
- [x] Firebase authentication structure
- [x] API client with all endpoints
- [x] Haptic feedback system
- [x] Glass morphism UI effects

## 🎯 Priority 1: Home Screen Features

### Home View
- [ ] **Greeting with user name**
  - Good morning/afternoon/evening based on time
  - Heart icon animation
  - User display name or email

- [ ] **Learning Progress Card**
  - Total points display with star icon
  - Progress toward next achievement
  - Achievement counter (X of Y)
  - Progress bar for next goal
  - Tap to navigate to Rewards page

- [ ] **Recent Chats Section**
  - Show chats filtered by active class
  - "Recent Chats - [Class Name]" header
  - "+ New Chat" button
  - Empty state: "No chats yet" with icon
  - Chat list with:
    - Chat name
    - Message count
    - Last updated time
    - Swipe actions (edit, delete)
    - Inline edit mode for renaming

- [ ] **Scroll behavior**
  - Fade mask at top of scroll
  - Smooth scrolling
  - Bottom padding for tab bar

## 🎯 Priority 2: Chat Interface

###ChatView
- [ ] **Message Display**
  - User messages (right aligned, purple bubble)
  - AI messages (left aligned, dark bubble)
  - Timestamp for each message
  - Loading indicator while AI responds
  - Citations display below AI messages

- [ ] **Input Area**
  - Text input field at bottom
  - Send button (enabled when text present)
  - Keyboard handling (resize content)
  - Command suggestions (e.g., `/background`)

- [ ] **Session Management**
  - Load previous chat sessions
  - Auto-save messages
  - Session name generation
  - Clear chat option

- [ ] **Chat Status Bar**
  - Show active class
  - Document count for class
  - Status indicators

- [ ] **Citations**
  - Source document name
  - Page number
  - Preview text
  - Relevance score
  - Tap to expand/view full citation

## 🎯 Priority 3: Documents Management

### DocumentsView
- [ ] **Document List**
  - Grid or list view
  - Document thumbnails/icons
  - File name
  - File type and size
  - Upload date
  - Chunks count
  - Assigned classes badges

- [ ] **Upload Functionality**
  - "+" button to upload
  - File picker (PDF, DOC, DOCX, TXT, MD)
  - Upload progress indicator
  - Multiple file upload support

- [ ] **Document Actions**
  - Tap to preview
  - Swipe to delete
  - Edit filename inline
  - Assign to classes
  - View processing status

- [ ] **Filtering**
  - Filter by class
  - Filter by file type
  - Sort options (date, name, size)
  - Search documents

- [ ] **Empty State**
  - "No documents yet" message
  - Upload prompt
  - Icon visual

## 🎯 Priority 4: Rewards & Achievements

### RewardsView
- [ ] **Segmented Control**
  - Achievements tab
  - Store tab (future)
  - Smooth tab switching

- [ ] **Points Display**
  - Total points in header
  - Star icon with glow effect
  - Points animation on earn

- [ ] **Achievements Grid**
  - Achievement cards in grid
  - Icon for each achievement
  - Name and description
  - Progress bar
  - Lock/unlock status
  - Points value
  - Unlock date (if unlocked)

- [ ] **Achievement Notification**
  - Toast notification when unlocked
  - Celebration animation
  - Sound/haptic feedback
  - Points earned display

- [ ] **Progress Tracking**
  - Current progress vs target
  - Percentage complete
  - Visual progress ring/bar

## 🎯 Priority 5: Class Management

### Class Creation Flow
- [ ] **2-Step Modal**
  - Step 1: Class info (name, domain type, description)
  - Step 2: Document assignment
  - Back/Next navigation
  - Progress indication

- [ ] **Class Info Form**
  - Name input field
  - Domain type grid (9 types with icons)
  - Description textarea (optional)
  - Form validation
  - Error messages

- [ ] **Document Assignment**
  - List of existing documents
  - Checkbox selection
  - Upload new document option
  - Empty state handling

- [ ] **Class Editing**
  - Edit existing class details
  - Reassign documents
  - Delete class with confirmation
  - Update active class status

## 🎯 Priority 6: Settings & Profile

### SettingsModal
- [ ] **Main Settings Page**
  - Profile section (avatar, name, email)
  - Account settings link
  - Appearance settings link
  - API settings link
  - Advanced settings link
  - Help link
  - Timezone settings
  - Sign out button

- [ ] **Account Settings**
  - Display name editing
  - Email display
  - Password change
  - Delete account option

- [ ] **Appearance Settings**
  - Theme selection (dark/light/auto)
  - Background pattern options
  - Font size options

- [ ] **API Settings**
  - API key input
  - Model selection dropdown
  - Temperature slider
  - Max tokens slider
  - Test connection button

- [ ] **Advanced Settings**
  - Clear cache
  - Reset preferences
  - Debug mode toggle
  - Version info

- [ ] **Profile Image**
  - Avatar display
  - Change photo option
  - Crop functionality
  - Upload progress

## 🎯 Priority 7: Navigation & UX

### Onboarding
- [ ] **Welcome Screen**
  - App logo/icon
  - Welcome message
  - Feature highlights (3 cards)
  - "Get Started" CTA

- [ ] **Class Creation Wizard**
  - Guided flow for first class
  - Explanation of classes
  - Skip option

### Global Search
- [ ] **Search Overlay**
  - Full-screen modal
  - Search input with focus
  - Scope toggle (current class / all classes)
  - Results sections:
    - Chats results
    - Documents results
  - Result cards with navigation
  - Empty state

### Animations
- [ ] **Slide in from bottom** (cards, sheets)
- [ ] **Fade in** (overlays, backdrops)
- [ ] **Scale** (buttons on press)
- [ ] **Pulse** (heart icon, active indicators)
- [ ] **Progress bar fill** (smooth animation)
- [ ] **Skeleton loading** (content placeholders)

### Haptics
- [ ] **Light tap** - Button presses
- [ ] **Selection** - Tab switches, toggles
- [ ] **Success** - Achievement unlocks, successful actions
- [ ] **Error** - Failed actions, validation errors
- [ ] **Impact** - Swipe actions, card interactions

## 🎯 Priority 8: Error Handling & States

### Loading States
- [ ] Splash screen while app initializes
- [ ] Shimmer/skeleton for loading content
- [ ] Progress indicators for uploads
- [ ] Pull-to-refresh on lists

### Empty States
- [ ] No classes yet
- [ ] No chats yet
- [ ] No documents yet
- [ ] No achievements unlocked
- [ ] No search results

### Error States
- [ ] API connection errors
- [ ] Upload failures
- [ ] Authentication errors
- [ ] Validation errors
- [ ] Network offline state

## 📱 iOS-Specific Features to Add

### Native Features
- [ ] Face ID / Touch ID authentication
- [ ] ShareSheet for documents
- [ ] Document picker integration
- [ ] Photo library integration (for profile)
- [ ] Camera integration (for document scanning)
- [ ] Haptic feedback (already implemented)
- [ ] System share extension
- [ ] 3D Touch / Haptic Touch menus

### iOS Design Patterns
- [ ] SwiftUI navigation
- [ ] Pull to refresh
- [ ] Context menus (long press)
- [ ] Swipe actions on lists
- [ ] Action sheets for destructive actions
- [ ] Alert dialogs for confirmations
- [ ] Activity indicators
- [ ] Safe area handling

## 🎨 Visual Parity

### Colors & Gradients
- Background: `#1A1A2E` → `#16213E` → `#0F3460` (already implemented)
- Purple: `#6D5FFD` → `#9E78FF` (already implemented)
- Glass effects: `.ultraThinMaterial` (already implemented)

### Typography
- Large titles: 34pt, Bold (already implemented)
- Body text: 17pt, Regular (already implemented)
- iOS system font (already implemented)

### Spacing & Layout
- Card padding: 16-20pt
- Card radius: 16-20pt
- Section spacing: 24pt
- Element spacing: 8-12pt

---

## Implementation Order

1. ✅ Foundation (Complete)
2. **HomeView with Learning Progress + Recent Chats** ← START HERE
3. **ChatView with message sending**
4. **DocumentsView with upload**
5. **RewardsView with achievements**
6. **Class creation/editing flow**
7. **Settings screens**
8. **Polish & animations**

---

This document tracks all features from the React mobile app that need to be ported to native Swift.
