# FatGoats Studios — Engineering Constitution

## 1. Core Principles & Boundaries
- **Domain Fidelity**: FatGoats Studios is a production-grade digital operating system for film, television, animation, and indie creator studios. Every module must reflect cinematic production realities (call sheets, Fountain screenplay formatting, continuity checks, voice auditions, shot planning).
- **Aesthetic Direction**: Deep Dark Studio theme (#08090e base, zinc/slate surfaces #0f1117, #181b23, #222734, warm amber/gold slate accents #f59e0b, #d97706, high contrast white text #f8fafc). No generic templates or purple gradients.
- **Relational Integrity**: Complete SQLite relational schema on the Rust backend with automated migrations, covering projects, episodes, scenes, characters, storyboards, whiteboards, chat messages, assets, kanban tasks, milestones, soundboard clips, lore, and audit activities.
- **Cross-Platform Delivery**:
  - Web: Responsive React 19 + Vite SPA with offline caching and sync.
  - Windows: Native `.exe` built in Rust serving frontend + backend + desktop launcher.
  - Mobile: Capacitor native app wrappers configured for Android (`android/`) and iOS (`ios/`).
- **Offline Resilience**: Bidirectional synchronization with offline backlog queue and live connection heartbeat.
- **Data Portability**: Full workspace ZIP export and import preserving all relational tables and media references.
