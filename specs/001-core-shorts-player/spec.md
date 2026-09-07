# Feature Specification: FocusScroll Core Shorts Player

**Feature Branch**: `001-core-shorts-player`

**Created**: 2026-09-07

**Status**: Draft

**Input**: User description: "Build an intentional, distraction-free YouTube Shorts player for iOS Safari PWA that strictly constrains playback to a user-curated playlist and provides native-feeling vertical snap-scrolling while blocking all native YouTube UI and algorithms."

---

## Clarifications

### Session 2026-09-07
- Q: When an individual YouTube Short finishes playing to the end, how should the player handle playback? → A: Play the video only once without auto-looping and without auto-advancing; upon completion, display a centered replay button to allow manual replay; advance to the next video strictly when the user performs a vertical swipe.
- Q: When a user launches FocusScroll for the very first time (with empty local storage), how should the app greet them? → A: Display a clean empty state with an option to "Load sample videos" or add a video manually; do not automatically inject videos into storage without user consent.
- Q: When the user closes FocusScroll and reopens it later, where should playback resume? → A: Resume at the last-watched video position (persist active index in local storage).
- Q: When a user imports a JSON playlist file and their current playlist already has videos, how should the app resolve the import? → A: Prompt user to choose between "Replace existing" (with confirmation) and "Merge unique items" (append non-duplicates).
- Q: On taller modern iPhone displays (e.g., 19.5:9), how should standard 9:16 YouTube Shorts be framed in the viewport? → A: Fit entire video (containment framing) to ensure all subtitles and visuals remain 100% visible without cropping; black letterbox bars fill remaining space.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Fullscreen Intentional Playback with Gesture Audio Unlock (Priority: P1)

As a viewer seeking a distraction-free experience, I want to open FocusScroll from my iOS home screen, tap once to unlock audio, and watch my curated YouTube Shorts without ever seeing YouTube recommendations, comments, related videos, or native links.

**Why this priority**: This is the core MVP and the foundation of FocusScroll's mission (Constitution Principle P1: Zero Algorithmic Leakage and P3: WebKit Autoplay Compliance). Without this, the app does not fulfill its primary reason for existing.

**Independent Test**:
Can be verified on mobile Safari (standalone PWA) by loading the initial feed, tapping the viewport to initiate unmuted playback, and confirming no YouTube interactive UI elements or suggested videos can be tapped or navigated to.

**Acceptance Scenarios**:
1. **Given** FocusScroll is launched on iOS Safari in standalone mode with at least one video in the queue, **When** the page loads, **Then** the player fills the dynamic screen (`100dvh`, respecting notch and home indicator) and displays an unobtrusive "Tap to play" prompt while keeping audio muted.
2. **Given** the "Tap to play" prompt is displayed, **When** the user taps anywhere on the viewport, **Then** the prompt dismisses immediately, playback begins with audio unmuted, and the audio context is permanently unlocked for the session.
3. **Given** a video is playing, **When** the user taps on any part of the video surface, **Then** the tap is captured by the gesture overlay to toggle Play/Pause, and no native YouTube links, channel pages, or external URLs can be activated.
4. **Given** a video is playing, **When** the user single-taps the screen, **Then** playback toggles between `PLAYING` and `PAUSED` with a momentary visual indicator.
5. **Given** an individual video finishes playing to the end (`ENDED` state), **When** playback concludes, **Then** the video does NOT loop and does NOT auto-advance; a centered replay button overlay is displayed, and the video advances only when the user executes a vertical swipe.
6. **Given** a video displayed on a non-9:16 aspect ratio screen (e.g. iPhone 15 Pro), **When** rendered, **Then** the entire 9:16 video frame is visible without cropping, centered over a solid black background.

---

### User Story 2 - Native-Feeling Vertical Snap Navigation (Priority: P2)

As a viewer used to native short-video gestures, I want to swipe vertically up and down to transition between videos with responsive threshold snapping and smooth animations, with zero iOS rubber-banding or accidental text selection.

**Why this priority**: High-fidelity touch mechanics (Constitution Principle P2) are essential so users don't abandon the PWA in favor of algorithmic feeds due to clunky web scrolling.

**Independent Test**:
Can be verified on a touch device by swiping up with fast velocity (≥ 300 px/s) or distance (≥ 30% viewport height) to snap to the next video, swiping down to navigate back, and testing partial drags that snap back smoothly without page reload or rubber-banding.

**Acceptance Scenarios**:
1. **Given** a video is playing at position N, **When** the user performs an upward swipe with velocity ≥ 300 px/s or displacement ≥ 30% of viewport height, **Then** the active card animates upward via `transform: translateY()`, the next video (position N+1) is swapped into the existing player via `loadVideoById()`, the active index persists to local storage, and audio continues unmuted without requiring a tap.
2. **Given** a video is playing, **When** the user drags vertically less than 30% height and releases with velocity < 300 px/s, **Then** the view rebounds smoothly to the current video without changing playback.
3. **Given** the user is viewing the first video (position 1), **When** the user swipes downward, **Then** the card bounces slightly and snaps back, displaying a brief "First video" toast.
4. **Given** the user is viewing the last video, **When** the user swipes upward, **Then** playback wraps to the first video in the list with a brief "Back to start" toast.
5. **Given** the user is swiping, **When** dragging the finger across the viewport, **Then** browser pull-to-refresh and rubber-band overscroll are blocked (`overscroll-behavior-y: contain`).

---

### User Story 3 - Local-First Playlist Management & Ingestion (Priority: P3)

As a curator, I want to open a management drawer to view my playlist, paste YouTube Shorts URLs, standard watch URLs, shortlinks, or raw IDs, reorder items, delete items, and backup my list via JSON export/import so that my curation lives entirely on my device.

**Why this priority**: Fulfills Constitution Principle P4 (Local-First & Zero-Friction Storage). Allows users to build, personalize, and safeguard their library without server dependencies or tracking.

**Independent Test**:
Can be verified by opening the playlist drawer, pasting various URL formats (valid and invalid), deleting an item, reordering items, exporting JSON, clearing data, and re-importing JSON to confirm full state restoration.

**Acceptance Scenarios**:
1. **Given** the user launches the app for the first time with an empty playlist, **When** the app opens, **Then** an onboarding view is presented with "Load sample videos" and "Add a video" actions; no videos are added until chosen.
2. **Given** the onboarding view, **When** the user taps "Load sample videos", **Then** 3 curated public Shorts are persisted to storage and playback begins.
3. **Given** an existing playlist and a user returning after closing the app, **When** the app opens, **Then** playback resumes at the last-watched video position stored in `PlaylistStore.lastActiveIndex`.
4. **Given** the input field in the drawer, **When** the user pastes any of `https://youtube.com/shorts/<id>`, `https://youtube.com/watch?v=<id>`, `https://youtu.be/<id>`, or a raw 11-char ID, **Then** the parser extracts the 11-character ID, sanitizes it, and appends it to local storage (IndexedDB/localStorage).
5. **Given** an invalid or malformed URL/text, **When** submitted, **Then** an inline error "Invalid YouTube video link or ID" is surfaced and no record is added.
6. **Given** a duplicate video ID already present in the list, **When** submitted, **Then** a notification "This video is already in your list" is shown and duplicate addition is blocked.
7. **Given** a non-empty playlist and an import file selected, **When** the user initiates JSON import, **Then** the app prompts: "Replace existing playlist" or "Merge unique items".
8. **Given** the import prompt, **When** "Replace" is chosen, **Then** current items are cleared and replaced with the imported list; **When** "Merge" is chosen, **Then** only non-duplicate imported items are appended.

---

### Edge Cases

- **Embed-restricted / deleted video**: When a video ID is valid but YouTube returns error 101 or 150 (embedding disallowed), the player catches the event, displays a non-intrusive toast ("Video unavailable — skipping"), and automatically advances to the next video after a 2-second grace period.
- **Consecutive playback errors**: If 3 or more videos fail to load consecutively, auto-advance halts and a full-screen "No playable videos" message appears with a direct link to open the playlist drawer.
- **Empty playlist state**: If the user deletes all items or launches clean, the app enters an empty state screen with an illustrated guide and a "Load sample videos" or "Add a video" action.
- **Offline operation**: If internet connection drops during playback, the app maintains the current UI and surfaces a toast ("Connection lost — video stream paused"). Storage, drawer management, and export/import remain 100% operational offline.
- **Rapid gesture spam**: If the user swipes rapidly while a transition is in progress (`TRANSITIONING` state), subsequent swipe events are locked and ignored until the active animation and video load settle.
- **Audio session interruption**: If an incoming phone call or external audio interrupt pauses playback, the player transitions to `PAUSED` and requires a tap to resume.
- **Natural video end (no auto-advance, no auto-loop)**: When a video reaches 100% duration, playback stops on the final frame and reveals the centered replay button. No advance occurs until an upward swipe is committed.
- **App relaunch position restoration**: When the app is closed and relaunched, `lastActiveIndex` is checked against playlist length. If valid, that index is loaded; if invalid (e.g. video was deleted), it falls back to 0.

---

## Requirements *(mandatory)*

### Functional Requirements

#### Viewport & Shell
- **FR-001**: System MUST configure viewport metadata for iOS Safari (`width=device-width, initial-scale=1, viewport-fit=cover`).
- **FR-002**: System MUST render using dynamic viewport units (`100dvh`) and respect `env(safe-area-inset-top/bottom/left/right)`.
- **FR-002a**: System MUST frame standard 9:16 Shorts with containment scaling (`object-fit: contain` equivalent) centered on a solid black background, ensuring 100% of video content and subtitles are preserved without edge cropping.
- **FR-003**: System MUST provide a valid Web App Manifest (`display: standalone`, custom icons, name: "FocusScroll") and iOS-specific meta tags (`apple-mobile-web-app-capable: yes`, `black-translucent` status bar).
- **FR-004**: System MUST apply `overscroll-behavior-y: contain`, `user-select: none`, and `-webkit-touch-callout: none` to prevent browser rubber-banding, text selection, and callout menus.

#### Playback Engine & Isolation
- **FR-005**: System MUST load the official YouTube IFrame Player API dynamically and reuse a single player instance across all video transitions.
- **FR-006**: System MUST instantiate the IFrame with parameters: `controls=0`, `rel=0`, `modestbranding=1`, `playsinline=1`, `fs=0`, `loop=0`, `disablekb=1`.
- **FR-007**: System MUST render a full-coverage transparent overlay layer directly above the IFrame with `pointer-events: none` on the iframe wrapper to block tap-throughs to YouTube links, channels, and end-screen recommendations.
- **FR-008**: System MUST gate initial unmuted playback on a deliberate user tap, displaying a "Tap to play" prompt until activated.
- **FR-009**: System MUST preserve the unlocked audio context and play subsequent videos unmuted programmatically using `loadVideoById()`.
- **FR-010**: System MUST handle player error codes (100, 101, 150) by surfacing a transient toast and auto-advancing after 2 seconds.
- **FR-010a**: System MUST NOT auto-loop the current video and MUST NOT auto-advance to the next video upon playback completion (`YT.PlayerState.ENDED`). Instead, it MUST display a centered replay button allowing manual replay on tap, while maintaining swipe navigation readiness.

#### Touch & Gesture Mechanics
- **FR-011**: System MUST track vertical touch gestures via `touchstart`, `touchmove`, `touchend`.
- **FR-012**: System MUST commit a swipe when velocity ≥ 300 px/s OR vertical displacement ≥ 30% viewport height.
- **FR-013**: System MUST execute card transitions using GPU-accelerated CSS `transform: translateY()` with `will-change: transform`.
- **FR-014**: System MUST handle single-tap events on the active viewport to toggle `PLAYING` and `PAUSED`.
- **FR-015**: System MUST wrap from last video to first video on swipe up, and bounce back on swipe down from the first video.
- **FR-016**: System MUST lock gesture inputs during the `TRANSITIONING` state to prevent animation overlap or race conditions.

#### Playlist Management
- **FR-017**: System MUST persist the playlist locally in IndexedDB (with localStorage fallback) with 0 network calls for list storage.
- **FR-017a**: System MUST persist the active playback index (`lastActiveIndex`) locally, automatically restoring playback to that position on next session start.
- **FR-018**: On first launch (empty storage), system MUST display a clean onboarding empty-state screen presenting two actions: "Load sample videos" (injects 3 curated demo Shorts) and "Add a video" (opens management drawer). No videos are persisted until the user chooses an action.
- **FR-019**: System MUST extract 11-character video IDs using a unified regex supporting:
  - `/shorts/([a-zA-Z0-9_-]{11})`
  - `[?&]v=([a-zA-Z0-9_-]{11})`
  - `youtu\.be/([a-zA-Z0-9_-]{11})`
  - `^[a-zA-Z0-9_-]{11}$`
- **FR-020**: System MUST reject invalid inputs with an informative validation error message.
- **FR-021**: System MUST reject duplicate video IDs with a descriptive notification.
- **FR-022**: System MUST allow users to delete any item from the playlist drawer, adjusting playback smoothly if the active video is deleted.
- **FR-023**: System MUST support exporting the playlist to a downloadable JSON file conforming to schema v1.0.0.
- **FR-024**: System MUST support importing a playlist from JSON with schema validation. If the active playlist is non-empty, system MUST prompt the user to choose between "Replace existing" (with confirmation) and "Merge unique items" (appending new non-duplicates).

#### Heads-Up Display (HUD)
- **FR-025**: System MUST display a top position pill indicating current item and total count (e.g., `3 / 10`), respecting safe-area insets.
- **FR-026**: Position pill MUST auto-fade after 3 seconds of inactivity and reappear upon touch interactions.
- **FR-027**: System MUST show a centered buffering spinner when video streaming stalls for > 500 ms.
- **FR-028**: System MUST surface transient, auto-dismissing toasts (2.5 s duration) for system alerts and edge case notifications.

---

### Key Entities

- **VideoEntry**:
  - `id`: string (11-character alphanumeric YouTube ID, regex-validated)
  - `addedAt`: number (timestamp in ms)
  - `title`: string (optional user-assigned label, max 100 characters)
- **PlaylistStore**:
  - `version`: number (data model version, integer)
  - `items`: Array<VideoEntry> (ordered list of playlist items)
  - `lastActiveIndex`: number (persisted index of the last-played video, 0-indexed)
  - `updatedAt`: number (timestamp in ms of last mutation)
- **ExportPayload**:
  - `schema`: string ("1.0.0")
  - `exportedAt`: string (ISO-8601 timestamp)
  - `playlist`: Array<VideoEntry>

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Initial launch to first playable frame loads in under 3.0 seconds on standard mobile network connections.
- **SC-002**: Gesture transition to next video initiates card translation within 16 ms (1 frame at 60 fps) of touch release.
- **SC-003**: 0 native YouTube UI controls, channel links, comments, or related videos are accessible or clickable across 100% of user touch interactions.
- **SC-004**: Audio remains continuous and unmuted across at least 20 consecutive video swipe transitions after the initial gesture unlock.
- **SC-005**: 100% of valid Shorts URLs, watch URLs, youtu.be links, and raw IDs are parsed correctly without user error.
- **SC-006**: 100% of malformed or non-YouTube URLs are rejected with user-visible validation feedback.
- **SC-007**: PWA shell and local playlist management load and function completely offline.
- **SC-008**: Exported playlist JSON re-imports with 100% data fidelity (order, IDs, and timestamps preserved).
- **SC-009**: Production build bundle size does not exceed 150 kB gzipped (excluding external YouTube API script).
- **SC-010**: Upon video completion (`ENDED`), the player does not advance or loop without user interaction in 100% of completed playback runs.
- **SC-011**: On relaunching the application, 100% of sessions resume at the exact video position last viewed by the user.
- **SC-012**: 100% of 9:16 Shorts maintain full visibility with zero edge cropping across tested screen dimensions.

---

## Assumptions

- **A-001**: Playback orientation is vertical/portrait. Landscape mode is tolerated but optimized for mobile vertical consumption.
- **A-002**: Video titles are optional and entered manually by the user or defaulted to ID; the app does not call the YouTube Data API v3 to fetch metadata, maintaining local privacy and zero API quota costs.
- **A-003**: Default swipe direction follows industry convention: swipe up moves to next video, swipe down moves to previous video.
- **A-004**: End of playlist loops to the first video automatically when swiping past the final item.
- **A-005**: YouTube IFrame API script is loaded from `https://www.youtube.com/iframe_api` on initial network connection.

---

*FocusScroll Core Shorts Player Specification v1.0.0*
