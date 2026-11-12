# FatGoats Studios — Digital Creative Operating System

> **An all-in-one digital operating system for film, television, animation, and indie creator studios to manage every phase of production—from early concept art and worldbuilding lore to screenplay drafts, character dossiers, storyboarding, team communication, and scheduling.**

---

## 🚀 Architecture & Technical Stack

FatGoats Studios is built for cross-device fidelity across **Windows Desktop**, **Web**, **Android**, and **iOS**:

| Layer | Technologies | Purpose |
| :--- | :--- | :--- |
| **Backend** | **Rust**, `axum`, `tokio`, `rusqlite` (bundled SQLite), `tower-http`, `tungstenite` | High-performance asynchronous REST API, SQLite relational persistence, WebSocket live broadcast hub, and self-hosting web server. |
| **Windows Native App** | Native Windows x86_64 Executable (`fatgoats-studios.exe`) | Standalone zero-dependency executable bundling both backend engine and production frontend. |
| **Frontend UI** | **React 19**, **TypeScript**, **Tailwind CSS**, **Lucide Icons**, **JSZip** | Cinematic dark studio mode design system (`#08090e` base, zinc/slate surfaces, warm amber/gold slate accents, high contrast typography). |
| **Mobile (Android & iOS)** | **Capacitor 7**, Android Gradle (`android/`), iOS Xcode (`ios/`) | Cross-platform mobile applications with native touch ergonomics (>=44px touch targets, mobile slide-over drawer, safe area padding). |
| **Offline Sync Engine** | Heartbeat monitor, `localStorage` client caching & offline mutation queue | Full bidirectional synchronization. When offline, edits are queued and synced automatically upon reconnection. |
| **Data Portability** | `.ZIP` Project Archive Engine | Full workspace export and import preserving all relational tables, Fountain scripts, character dossiers, and metadata. |

---

## 🎬 13 Studio Modules & Capabilities

### 1. 🚀 Project Dashboard (`ProjectDashboard.tsx`)
- **Production Metrics & KPI Cards**: Real-time counts of total episodes, scenes written, active cast/characters, open production tasks, and stored vault assets.
- **Time-Lock Countdown Tracker**: Live hour-by-hour countdown for embargoed confidential scenes.
- **Season & Episode Status Bars**: Completion percentage meters tracking progression from script to screen.
- **Quick-Access Action Bar**: Fast-track shortcuts to write scenes, register characters, drop whiteboard ideas, or dispatch messages.
- **Sync Status Indicator**: Real-time monitor of the Rust SQLite database connection and pending offline backlog counts.

### 2. 📝 Scripts & Screenplay Suite (`ScriptEditor.tsx`, `ScriptAnalytics.tsx`)
- **Fountain Screenplay Engine**: Native Fountain markdown screenplay parser that renders standard Hollywood script formatting (Scene Headings EXT./INT., Action blocks, Character cues, Dialogue, Parentheticals, Transitions).
- **Spoiler & Embargo Time-Locking**: Mark confidential scenes with a future unlock timestamp (`locked_until`). Before the target time, content remains locked behind an active countdown clock.
- **Character Continuity Auto-Detection**: Scans script dialogue and action blocks for character names, linking them directly to character dossiers.
- **In-Scene Voice Memos**: Record audio memos directly into individual scenes using in-browser microphone capture.
- **Teleprompter / Script Reader Mode**: Full-screen distraction-free reader mode with adjustable autoscroll speed and font sizes for rehearsals.
- **Script Analytics**: Analyzes dialogue frequency, word counts, scene counts, and character speaking time distribution.

### 3. 👥 Character Continuity & Intelligence Dossiers (`CharacterProfiles.tsx`)
- **Multi-Tab Dossier**:
  - *Bio & Demographics*: Name, age, role, detailed backstory, and personality traits.
  - *Visual Gallery*: Character reference art, costume variations, and design turnarounds.
  - *Voice Archive*: In-browser microphone audio recorder to capture and play back voice actor auditions, accents, and character voice tests.
  - *Global Mentions Matrix*: Cross-platform intelligence scanning scenes, tasks, storyboards, and chat discussions referencing the character.
  - *Linked Cast & Crew*: Connects fictional character profiles to registered team members.

### 4. 🎨 Creative Whiteboard & Moodboard (`CreativeWhiteboard.tsx`)
- **Infinite Spatial Canvas**: Interactive canvas with smooth pan & zoom controls.
- **Node Variety**: Color-coded sticky notes, moodboard images with adjustable dimensions, narrative idea blocks, and text annotations.
- **Visual Connectors**: SVG connector arrows linking nodes together with relationship labels.
- **Multi-Board Management**: Create separate whiteboards with Pin and Lock protection against accidental edits.

### 5. 🖼️ Storyboard Sequence Builder (`StoryboardBuilder.tsx`)
- **Shot-by-Shot Frame Sequence**: Ordered visual cards with duration meters and animatic blocking.
- **Director Controls**: Camera framing (Extreme Close-Up, Close-Up, Medium, Wide, Dutch Angle, Over-the-Shoulder) and camera movements (Pan, Tilt, Tracking, Dolly Zoom, Crane).
- **Dialogue & Notes**: Paired character dialogue, sound effects, and director instructions.
- **Shot Reordering**: Reorder shots with drag-and-drop and arrow controls.

### 6. 💬 Team Communication Hub (`CommunicationHub.tsx`)
- **Channel & DM Architecture**: Department channels (`#writers-room`, `#animation`, `#sound`, `#general`) and 1-on-1 direct messages.
- **Live WebSocket Messaging**: Instant sub-millisecond message delivery across team members.
- **Rich Message Types**:
  - In-browser Voice Notes with microphone recording and playback.
  - Syntax-highlighted Screenplay Snippets embedded directly into chat.
  - Whiteboard Coordinate Pins linking to canvas locations.
  - Interactive Team Polls with live real-time voting bars.
  - Soundboard Audio Attachments.

### 7. 📋 Tasks & Production Kanban (`KanbanBoard.tsx`)
- **Workflow Stages**: Customizable columns (Backlog, In Scripting, Animation & VFX, Review & Dailies, Approved).
- **Character Profile Tagging**: Attach character avatars to task cards to track actor casting, 3D modeling, or costume design.
- **Deadline Warnings**: Color-coded overdue and upcoming notices.
- **Filters**: Instant board filtering by team member or specific episode/season.

### 8. 🗄️ Asset & Media Vault (`AssetVault.tsx`)
- **Virtual Directory Tree**: Organize concept art, posters, soundtracks, 3D models, reference photos, and PDFs.
- **Instant Previews**: Image modals, audio waveform players, and document viewers.
- **Taxonomies & Versioning**: Multi-tag classification and version control (`v1.0`, `v3.2`).
- **Deep Linking**: Reference assets directly inside Lore wiki entries and scene binders.

### 9. 📻 Show Soundboard (`Soundboard.tsx`)
- **Categorized Sound Banks**: Dialogue cuts, Soundtracks/Scores, Foley, SFX, Ambient atmospheres.
- **Live In-Browser Recording**: Record lines or sound effects using your microphone and save them directly to the clip library.
- **Playback & Waveform Controls**: Volume controls, clip looping, and audio duration meters.
- **1-Click Chat Integration**: Dispatch clips directly into team chat channels with a single click.

### 10. 📖 Lore & Worldbuilding Bible (`LoreWiki.tsx`)
- **Franchise Encyclopedia**: Series bible articles documenting world lore, factions, technology, locations, magic systems, and timelines.
- **Custom Key-Value Property Cards**: Structured metadata fields (e.g. *Government: Coalition Council*, *Ship Class: Mark IV Recon*).
- **Embedded Media**: Embed assets from the Asset Vault directly onto lore pages.

### 11. 📅 Project Timeline & Milestones (`TimelineView.tsx`)
- **Production Phase Roadmap**: Structured roadmaps across Scripting & Writing, Casting & Table Reads, Principle Photography, Post-Production & Scoring, and Distribution & Release.
- **Progress Tracking**: Milestone completion checkboxes and deadline countdowns.

### 12. 👤 Team Directory & Profiles (`TeamProfiles.tsx`)
- **Cast & Crew Directory**: User avatars, banner artwork, biographies, skill tags, and timezones.
- **Custom Studio Titles**: Lead Animator, Director of Photography, Showrunner, Sound Supervisor.
- **Live Working Hours & Status**: Active working hours and availability status emojis (e.g. 🎧 *In Scoring Session*).
- **1-Click Direct Messaging**: Instant jump to private direct chat.

### 13. ⚙️ System Administration & Security (`AdminPanel.tsx`)
- **Role-Based Access Control (RBAC)**: Super Admin (CEO), Admin, Editor, Viewer, and Custom tiers.
- **Cryptographic Invite Code Generator**: Generate tokens with usage limits and expiration dates.
- **Full Workspace ZIP Backup & Restore**: Export and import complete self-contained `.zip` packages.

---

## 📦 Running FatGoats Studios

### Option 1: Native Windows Executable (`.exe`)
Double-click `run-studio-windows.bat` or run:
```powershell
.\fatgoats-studios.exe --port 3001 --open
```
This starts the Rust SQLite engine and opens your browser to `http://localhost:3001`.

### Option 2: Web Application (Development Mode)
Run both backend and frontend concurrently:
```bash
# Terminal 1: Rust Backend
cd backend-rust
cargo run

# Terminal 2: Vite React Frontend
cd frontend
npm run dev
```
Open [http://localhost:5173](http://localhost:5173).

### Option 3: Android App
```bash
cd frontend
# Build web distribution and sync to Android project
npm run build
npx cap sync android

# Open in Android Studio or build APK with Gradle
npx cap open android
# Or build via command line:
cd android && gradlew assembleDebug
```

### Option 4: iOS App
```bash
cd frontend
# Build web distribution and sync to iOS project
npm run build
npx cap sync ios

# Open in Xcode to build for simulator or device
npx cap open ios
```

---

## 🗄️ Relational Database Schema (SQLite)

The Rust backend persists all state to `fatgoats_studios.db` with relational integrity:
- `projects`
- `episodes`
- `scenes`
- `characters`
- `storyboard_frames`
- `whiteboards`
- `chat_messages`
- `kanban_tasks`
- `assets`
- `soundboard_clips`
- `lore_articles`
- `milestones`
- `team_members`
- `audit_logs`
- `invite_codes`
- `system_settings`

---

## 🛡️ License
FatGoats Studios is proprietary creative software built for film, television, animation, and indie production studios.
