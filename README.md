# FocusScroll

> **Distraction-Free, Intentional YouTube Shorts Player & Progressive Web App (PWA)**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.2-646CFF.svg?logo=vite)](https://vitejs.dev/)
[![PWA Ready](https://img.shields.io/badge/PWA-Installable-purple.svg?logo=pwa)](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
[![Cloudflare Workers](https://img.shields.io/badge/Deploy-Cloudflare%20Assets-F38020.svg?logo=cloudflare)](https://workers.cloudflare.com/)
[![Tests](https://img.shields.io/badge/Tests-62%20Passing-brightgreen.svg?logo=vitest)](https://vitest.dev/)

FocusScroll is a lightweight, mobile-first web application engineered to break the algorithmic doom-scrolling loop. Instead of an addictive algorithm serving endless unpredictable videos with comments and recommendation traps, FocusScroll plays **only the videos you choose to add**, grouped into custom playlists or consolidated into a unified Main Feed, with fluid swipe gestures, local IndexedDB persistence, and full offline installability.

---

## Key Features

### 1. HomeScreen Launchpad & Feed Selector
* **Modern App Entrypoint**: Dedicated launchpad displaying your playlists, total video count, and live status.
* **Instant Feed Launch**: Start playing any playlist with a single tap, or jump directly into the consolidated Main Feed.
* **Hero Main Feed Card**: Features a prominent hero card aggregating all videos across every playlist into one continuous stream.
* **Version Information Pill**: Displays the active version (`v1.0.0`) and provides quick access to Version Control and Rollback snapshots.
* **One-Tap Home Return**: Return to the home screen anytime from the video player using the floating HUD home button (`🏠`).

### 2. Zero Algorithmic Traps & Consolidated Main Feed
* **Curated-Only Experience**: Zero external recommendation algorithms, comments sections, or sponsored distractions.
* **Consolidated Cross-Playlist Feed**: The Main Feed automatically unifies unique videos across all your playlists without manual cross-linking.
* **Intentional Consumption**: Full control over what you watch without endless discovery traps.

### 3. Multi-List Playlist Management
* **Custom Named Playlists**: Create, switch between, and manage multiple lists (e.g. *Main Feed*, *Workout Energy*, *Focus & Flow*).
* **Pill Tab Navigation**: Quickly switch active lists directly from the playlist drawer.
* **Per-List State**: Tracks your playback position (`lastActiveIndex`) independently across lists.
* **List Management**: Reorder videos, delete individual items, or delete entire custom lists with instant feedback.

### 4. Smart Video Ingestion
* **Universal Link Parsing**: Accepts standard YouTube links (`watch?v=...`), Short URLs (`youtube.com/shorts/...`), shortened links (`youtu.be/...`), mobile links (`m.youtube.com/...`), and raw 11-character video IDs.
* **Smart Batch Ingestion**: Paste multi-line text or blocks of URLs—FocusScroll automatically extracts all valid video IDs and ignores noise.
* **Duplicate Protection**: Detects and skips existing videos in the current list, notifying you with a toast.
* **Auto Thumbnailing**: Fetches crisp thumbnail previews (`hqdefault.jpg`) automatically for the playlist drawer.

### 5. Mobile-First Gestures & Native Feel
* **Fluid Swipe Navigation**: Swipe up for next video and swipe down for previous video with smooth touch tracking.
* **Velocity & Momentum Detection**: Supports both drag distance thresholds and flick gestures (velocity $\ge$ 0.4 px/ms) for snappy, effortless browsing.
* **Boundary Resistance**: Tactile rubber-band bounce when pulling past the top or bottom of the list.
* **Tap-to-Pause & Floating HUD**: Tap anywhere on the video to toggle playback with a sleek animated pause overlay.
* **Desktop Keyboard Shortcuts**:
  * <kbd>↓</kbd> / <kbd>PageDown</kbd> / <kbd>J</kbd> : Next Video
  * <kbd>↑</kbd> / <kbd>PageUp</kbd> / <kbd>K</kbd> : Previous Video
  * <kbd>Space</kbd> : Play / Pause
  * <kbd>M</kbd> : Toggle Playlist Drawer

### 6. 3-Slot Virtualized Player Pool
* **High Performance & Low Memory**: Maintains at most 3 lightweight YouTube IFrames (`active`, `next`, `previous`) to prevent mobile browser memory bloat while delivering instant swipe transitions.
* **Audio Autoplay Gate**: Gracefully handles mobile autoplay restrictions with a clear tap-to-unmute / start playback overlay.
* **Replay & Loop Controls**: Visual replay overlay when a short ends, allowing loop or quick swipe to the next item.
* **Error Resilience**: Catches embedding restrictions (YouTube errors 101/150) and provides direct fallback links without crashing the feed.

### 7. Version Control & Snapshot History
* **Git-Like Snapshot Checkpoints**: Save custom checkpoints of your playlists and videos (e.g. `v1.1 - Workout Pack`, `Before Cleanup`).
* **One-Click Rollbacks**: Restore your full library state to any previous version with automated state recovery and toast feedback.
* **App Version & Update Checker**: Directly view current app version (`v1.0.0`) and trigger PWA service worker update checks on the fly.
* **Checkpoint Portability**: Export individual snapshots or delete outdated checkpoints directly from the Version Control panel.

### 8. Robust Offline Persistence & Data Portability
* **Persistent Storage Backing**: Uses IndexedDB via `idb-keyval` with automatic fallback to `localStorage` and memory caching.
* **Storage Eviction Prevention**: Requests persistent storage permission (`navigator.storage.persist()`) on launch to avoid browser eviction on iOS Safari.
* **Export & Import**: Export your complete library and playlists to a `.json` backup file, or restore existing backups anytime.
* **Installable PWA**: Configured with Service Worker caching via `vite-plugin-pwa` and Workbox for standalone full-screen mobile installation.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Language** | [TypeScript](https://www.typescriptlang.org/) (Strict Mode, ES2022) |
| **Bundler & Dev Server** | [Vite](https://vitejs.dev/) v8.2+ |
| **PWA & Offline** | [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) v1.3+ & Workbox |
| **Storage Engine** | [idb-keyval](https://github.com/jakearchibald/idb-keyval) + IndexedDB |
| **Player Integration** | YouTube IFrame Player API |
| **Testing Framework** | [Vitest](https://vitest.dev/) v5.0+ & [JSDOM](https://github.com/jsdom/jsdom) |
| **Deployment** | [Cloudflare Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/) |

---

## Project Structure

```
focus-scroll/
├── public/                 # PWA icons & static assets (192px, 512px, apple-touch-icon)
├── src/
│   ├── components/         # Modular UI components
│   │   ├── audio-gate.ts       # Autoplay / mute permission barrier
│   │   ├── drawer.ts           # Playlist management drawer & multi-list tabs
│   │   ├── feed.ts             # Virtualized 3-slot feed manager & scroll coordinator
│   │   ├── home.ts             # HomeScreen launchpad, playlist selector, dopamine shuffle
│   │   ├── hud.ts              # Floating index indicator & controls (with Home button)
│   │   ├── onboarding.ts       # Welcome screen with sample shorts loader
│   │   ├── pause-indicator.ts  # Animated tap-to-pause visual overlay
│   │   ├── replay-overlay.ts   # Video completion replay overlay
│   │   ├── spinner.ts          # Smooth buffering & transition spinner
│   │   └── toast.ts            # Non-blocking notification toasts
│   ├── gestures/           # Touch & gesture engine
│   │   ├── engine.ts           # Touch event listeners, drag math, and velocity tracking
│   │   ├── navigation.ts       # Boundary checks & index transitions
│   │   └── thresholds.ts       # Distance, velocity, and resistance constants
│   ├── player/             # YouTube player lifecycle
│   │   ├── controller.ts       # Player wrapper controlling play, pause, seek, loop
│   │   ├── state-machine.ts    # Unstarted, Buffering, Playing, Paused, Ended states
│   │   └── yt-loader.ts        # Async YouTube IFrame API script loader
│   ├── storage/            # Data persistence
│   │   ├── backup.ts           # JSON export and import validator
│   │   ├── db.ts               # StorageManager class wrapping idb-keyval
│   │   └── seed.ts             # Default curated sample shorts
│   ├── styles/
│   │   └── main.css            # Responsive layout, dark theme, and mobile viewport styles
│   ├── types/              # TypeScript interface definitions
│   │   ├── gesture.ts          # Gesture coordinates, states, and event contracts
│   │   ├── player.ts           # Player options, states, and callbacks
│   │   └── storage.ts          # Playlist, VideoEntry, and store data structures
│   ├── utils/
│   │   └── url-parser.ts       # Robust YouTube URL and ID parser
│   └── main.ts             # Application bootstrapper and lifecycle manager
├── tests/
│   └── unit/               # Comprehensive unit test suites (61 tests)
│       ├── drawer-scroll-multilist.test.ts
│       ├── export-import.test.ts
│       ├── gesture-math.test.ts
│       ├── homescreen-and-consolidated-feed.test.ts
│       ├── iframe-config.test.ts
│       ├── multi-list.test.ts
│       ├── navigation.test.ts
│       ├── player-state.test.ts
│       ├── storage.test.ts
│       ├── url-parser.test.ts
│       └── version-control-and-onboarding.test.ts
├── index.html              # HTML entrypoint with PWA meta tags
├── package.json            # Project dependencies and npm scripts
├── tsconfig.json           # TypeScript configuration
├── vite.config.ts          # Vite build & PWA manifest configuration
├── vitest.config.ts        # Unit test configuration
└── wrangler.jsonc          # Cloudflare Workers Static Assets deployment config
```

---

## Getting Started

### Prerequisites
* **Node.js**: v18.0.0 or higher
* **npm**: v9.0.0 or higher

### Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/Lksharma906/focus-scroll.git
cd focus-scroll
npm install
```

### Development Server
Start the local Vite development server with hot-module replacement (HMR):
```bash
npm run dev
```
Open your browser at `http://localhost:5173`.

### Running Tests
Execute the unit test suite with Vitest:
```bash
npm test
```

### Production Build
Type-check with TypeScript and bundle optimized production assets:
```bash
npm run build
```
Built output is generated in the `dist/` directory, including the compiled bundle, service worker (`dist/sw.js`), and Web Manifest (`dist/manifest.webmanifest`).

### Local Preview
Preview the production build locally:
```bash
npm run preview
```

---

## Deployment

FocusScroll is configured for **Cloudflare Workers Static Assets**, providing instant global edge delivery and single-page application routing out of the box via [`wrangler.jsonc`](./wrangler.jsonc).

### Deploy to Cloudflare
```bash
npx wrangler deploy
```

#### `wrangler.jsonc` Configuration:
```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "focus-scroll",
  "compatibility_date": "2026-09-03",
  "assets": {
    "directory": "./dist",
    "not_found_handling": "single-page-application"
  }
}
```

The app can also be deployed to any static hosting provider (Vercel, Netlify, GitHub Pages, AWS S3 / CloudFront) by serving the `./dist` directory.

---

## Installing as a PWA

FocusScroll can be installed as a native-like app on mobile and desktop:
* **iOS (Safari)**: Open the app in Safari, tap the **Share** button, and select **Add to Home Screen**.
* **Android (Chrome)**: Tap the browser menu (<kbd>⋮</kbd>) and select **Install app** or **Add to Home screen**.
* **Desktop (Chrome / Edge / Brave)**: Click the **Install FocusScroll** icon in the address bar.

---

## License

MIT © [Lokesh Sharma](https://github.com/Lksharma906)
