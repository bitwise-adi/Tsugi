# TrackMe 🎯

TrackMe is a beautiful, offline-first habit tracker and task manager designed to help you build consistency and stay on top of your daily goals. Built as a Progressive Web App (PWA), it works flawlessly on both desktop and mobile devices.

## Features ✨

- **Habit Tracking:** Visualize your progress with an intuitive calendar view. Mark days as done, missed, or skipped.
- **Task Management:** Create, prioritize, and manage your daily tasks.
- **Local-First Architecture:** Your data is stored locally first using IndexedDB (via Dexie.js), ensuring blazing-fast performance and full offline support.
- **Cloud Sync:** Seamlessly sync your data across all your devices using Firebase Auth and Firestore. (Last-write-wins merging)
- **Reminders:** Get timely browser notifications for your scheduled tasks.
- **Customizable Themes:** Personalize your experience with Light, Dark, and System modes, along with multiple accent colors.
- **PWA Ready:** Install TrackMe directly to your home screen for a native app-like experience.

## Tech Stack 🛠️

- **Framework:** [Next.js 15](https://nextjs.org/) (App Router)
- **Language:** TypeScript
- **Styling:** Vanilla CSS Modules with custom CSS variables
- **Local Database:** [Dexie.js](https://dexie.org/) (IndexedDB wrapper)
- **Cloud Backend:** [Firebase](https://firebase.google.com/) (Auth & Firestore)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Dates:** [date-fns](https://date-fns.org/)

## Getting Started 🚀

First, clone the repository and install the dependencies:

```bash
npm install
```

To run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the app.

## Project Structure 📁

- `src/app/`: Next.js App Router pages and layouts
- `src/components/`: Reusable React components (UI elements, Habit/Task specific components)
- `src/hooks/`: Custom React hooks (e.g., `useHabits`, `useTasks`) for managing local data
- `src/lib/`: Core utilities (Firebase config, Sync logic, Notifications, Dexie schema)
- `src/types/`: TypeScript interfaces and types
- `public/`: Static assets, PWA manifest, and Service Worker

## License 📄

This project is open-source and available under the MIT License.
