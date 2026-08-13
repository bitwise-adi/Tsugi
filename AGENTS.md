<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Tsugi(t) — Agent Rules & Session Handoff

## 📋 Mandatory Session Start Protocol
At the start of every session, before making changes or answering complex questions:
1. **Read `PROGRESS.md`**: Check the latest session log, Phase Tracker, and next scheduled tasks.
2. **Review `suggestions/`**: Read `suggestions/LOCOME_IMPLEMENTATION_BRIEF.md` for security, sync outbox, and architectural constraints.
3. **Preserve Local-First Guarantee**: Dexie.js (IndexedDB) is always written first. Never require an active login or network connection for core habit/task tracking.

## 🏗️ Core Architecture & Tech Stack
- **Framework:** Next.js 16 (App Router, Turbopack, React 19 Client Components with `'use client'`)
- **Styling:** CSS Modules + Global design tokens (`globals.css`) with 6 accent themes & dark/light modes
- **Local DB:** Dexie.js (`src/lib/db.ts`)
- **Auth & Cloud:** Firebase Auth & Firestore (`src/lib/firebase.ts`, `src/lib/sync.ts`)
- **Security:** Server-mediated sharing via Firebase Admin SDK (no client-side write access to share grants)

