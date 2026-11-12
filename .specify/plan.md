# FatGoats Studios — Technical Plan

## Architecture & Technology Stack
- **Backend (Rust)**:
  - Framework: `axum` + `tokio` for async HTTP REST API & WebSockets.
  - Database: `rusqlite` (bundled SQLite 3) for zero external dependencies, ultra-fast transactional queries, and robust relational persistence in `fatgoats_studios.db`.
  - Realtime: WebSocket hub broadcasting chat messages, presence, and sync updates across connected clients.
  - Serialization: `serde`, `serde_json`, `chrono`, `uuid`.
  - Static File / Single Binary: Serves frontend SPA and REST API from a single Windows `.exe`.
- **Frontend (Web, Desktop & Mobile UI)**:
  - Framework: React 19 + TypeScript + Vite.
  - Styling: Tailwind CSS, custom dark studio tokens, strict 8pt grid, high contrast typography.
  - Icons: Lucide React quiet tactile icons.
  - Utilities: JSZip (ZIP export/import), Canvas API (whiteboards, audio visualization), Web Audio API (mic recording, soundboard playback).
- **Mobile & Cross-Platform (Android & iOS)**:
  - Capacitor 7 configuration with `capacitor.config.ts`.
  - Android native project scaffolding (`android/`).
  - iOS native project scaffolding (`ios/`).
  - Responsive ergonomics (touch targets >= 44px, safe area padding, collapsible touch drawer).
- **Desktop (Windows)**:
  - Native Windows executable (`fatgoats-studios.exe`) built via Cargo.
  - Capable of launching local server + opening the studio interface directly.
- **Git & GitHub Integration**:
  - Full repo tracking, git commits, push to `https://github.com/youngtoaster/fatgoats-studios`.
