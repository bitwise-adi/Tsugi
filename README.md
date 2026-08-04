# LocoMe 🎯

A beautiful, local-first habit tracker and task manager designed to help you build momentum, track consistency, and share progress with accountability partners. Built as a Progressive Web App (PWA) using Next.js 15, TypeScript, Dexie.js (IndexedDB), and Firebase.

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)
![Firebase](https://img.shields.io/badge/Firebase-Auth%20%26%20Firestore-orange?style=flat-square&logo=firebase)
![Dexie.js](https://img.shields.io/badge/Dexie.js-IndexedDB-green?style=flat-square)
![PWA](https://img.shields.io/badge/PWA-Ready-purple?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)

---

## ✨ Features

### 📅 Habit Tracking & Consistency
- **Visual Calendar Grid:** Monthly interactive calendar with quick status toggling (`Done` / `Missed` / `Excused`).
- **Flexible Frequencies:** Daily, weekly, bi-weekly, monthly, or custom day selection.
- **Streak & Analytics:** Current streak, best streak, total completions, and overall completion rate calculations.
- **Contribution Heatmap:** 16-week GitHub-style activity grid visualizing consistency over time.
- **Weekly Progress Charts:** 8-week completion bar chart built with pure CSS animations.
- **Quick Logging:** Fast status popup with optional journal notes and a dedicated "Done" button.

### 🤝 Social & Accountability Sharing (Read-Only)
- **Share Codes:** Generate unique 6-character share codes for any habit.
- **Native In-App Viewing:** Friends can enter your share code in their **Shared** tab to view your habits, streaks, calendar, and heatmaps in a clean, read-only interface.
- **Security & Privacy:** Enforced by an access-mirror security model in Firestore — only users who have claimed an active share code can view your data.
- **Revoke Anytime:** Owners can view who claimed their code and instantly revoke access.

### 📝 Task & Todo Management
- **Date Navigation & Organization:** Daily view with simple next/previous day navigation and a "Today" quick-jump button.
- **Priorities & Reminders:** Categorize tasks by priority (`Low`, `Medium`, `High`) and set scheduled time reminders.
- **Browser Notifications:** Native client-side notification reminders triggered at scheduled times.
- **Detailed Notes:** Expandable notes for task context and sub-items.

### ⚡ Local-First & Cloud Sync Architecture
- **Instant UI (Offline-First):** Powered by IndexedDB via **Dexie.js**. All changes write locally first for zero-latency interactions without spinners.
- **Cloud Sync:** Multi-device sync backed by Firebase Auth (Google & Email/Password) and Firestore with a robust last-write-wins merge strategy.
- **Sanitized Synchronization:** Automatic filtering of undefined fields to ensure clean Firestore transactions.

### 🎨 Design & Personalization
- **Theme Modes:** Light, Dark, and System modes with smooth transitions.
- **Accent Color System:** Choose from 6 curated palettes: `Purple`, `Blue`, `Teal`, `Rose`, `Amber`, and `Emerald`.
- **Hero Dashboard:** Branded landing page with accent glow, greeting, and summary metrics.
- **Data Portability:** Export your complete habit and task data anytime as **JSON** (full backup) or **CSV** (spreadsheet-ready).

### 📱 Progressive Web App (PWA)
- Fully installable on iOS, Android, macOS, and Windows.
- Service Worker with offline asset caching and network-first strategies.
- Standalone app experience with mobile-optimized bottom navigation tab bar.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [Next.js 15](https://nextjs.org/) (App Router, Turbopack) |
| **Language** | [TypeScript](https://www.typescriptlang.org/) |
| **Styling** | Vanilla CSS Modules & CSS Variables (zero runtime CSS-in-JS) |
| **Local Database** | [Dexie.js](https://dexie.org/) (IndexedDB wrapper) |
| **Authentication & Cloud** | [Firebase v11](https://firebase.google.com/) (Auth & Firestore) |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **Date Utilities** | [date-fns](https://date-fns.org/) |

---

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/trackme.git
cd trackme
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Firebase
Create a `.env.local` file in the root directory with your Firebase project credentials:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 4. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔒 Firestore Security Rules

To support secure multi-user data isolation and habit sharing, deploy the following Firestore security rules in your Firebase Console:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // User's own data — full read/write access
    match /users/{userId}/habits/{habitId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      // Allow read if an access mirror doc proves an active share
      allow read: if request.auth != null
        && exists(/databases/$(database)/documents/users/$(userId)/sharedWith/$(request.auth.uid));
    }

    match /users/{userId}/habitEntries/{entryId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null
        && exists(/databases/$(database)/documents/users/$(userId)/sharedWith/$(request.auth.uid));
    }

    match /users/{userId}/tasks/{taskId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    match /users/{userId}/preferences/{prefId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Access mirror subcollection
    match /users/{ownerId}/sharedWith/{viewerId} {
      allow create: if request.auth != null && request.auth.uid == viewerId;
      allow read, delete: if request.auth != null && request.auth.uid == ownerId;
      allow read: if request.auth != null && request.auth.uid == viewerId;
    }

    // Habit shares collection
    match /habitShares/{shareId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null
        && request.resource.data.ownerUserId == request.auth.uid;
      allow update: if request.auth != null;
    }
  }
}
```

---

## 📂 Project Structure

```
trackme/
├── public/                # Static assets, PWA manifest, service worker
│   ├── manifest.json
│   ├── sw.js
│   └── icons/
├── src/
│   ├── app/               # Next.js App Router pages
│   │   ├── auth/          # Authentication page (Google / Email)
│   │   ├── settings/      # Settings, themes, sync, and data export
│   │   ├── shared/        # Shared habits feed & share code claim
│   │   ├── tasks/         # Daily task manager
│   │   ├── layout.tsx     # Root layout with Theme & Auth providers
│   │   └── page.tsx       # Landing page & Habits dashboard
│   ├── components/        # Modular UI components
│   │   ├── auth/          # Auth forms & state
│   │   ├── habits/        # Habit cards, calendar, charts, heatmap, share modal
│   │   ├── layout/        # TabBar navigation & header
│   │   └── tasks/         # Task items, modals, priority controls
│   ├── hooks/             # Custom React hooks (useHabits, useTasks, usePreferences)
│   ├── lib/               # Utilities (db, sync, sharing, auth, export, notifications)
│   └── types/             # TypeScript definitions
└── PROGRESS.md            # Comprehensive session-by-session development log
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
