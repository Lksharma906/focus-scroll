# Research & Technology Decisions: FocusScroll Core Shorts Player

**Feature**: `001-core-shorts-player`  
**Date**: 2026-09-07  
**Status**: Completed  

---

## 1. Gesture Engine & Touch Tracking

### Decision
Implement custom touch mechanics directly using native DOM touch events (`touchstart`, `touchmove`, `touchend`) without third-party gesture libraries.

### Rationale
- Third-party libraries (Hammer.js, ZingTouch) add 15–40 kB to the bundle and often conflict with iOS Safari's native scroll gestures and dynamic viewport scaling.
- Native touch listeners with `{ passive: false }` provide deterministic calculation of vertical velocity (`dy / dt`) and displacement (`dy / viewportHeight`).
- Snapping logic: Thresholds of 300 px/s or 30% viewport height match TikTok/Shorts feel.

### Alternatives Considered
- **CSS Scroll Snap (`scroll-snap-type: y mandatory`)**: Rejected because iOS Safari scroll snap allows rubber-banding and pull-to-refresh to trigger, and makes intercepting touch events over an embedded iframe unreliable.
- **Hammer.js**: Rejected due to unmaintained codebase, bundle size bloat, and touch action conflicts with `overscroll-behavior-y: contain`.

---

## 2. YouTube IFrame Overlay & Interaction Isolation

### Decision
Render a full-coverage transparent `div` (`class="touch-overlay"`) with `z-index: 10` positioned directly above the YouTube IFrame (`z-index: 1`). Apply `pointer-events: none` to the IFrame container element.

### Rationale
- Constitution Principle P1 (Zero Algorithmic Leakage) requires 100% isolation.
- The transparent overlay intercepts every tap, swipe, and drag before it reaches the YouTube player's internal DOM.
- Taps are converted to Play/Pause toggles; vertical drags are converted to video transitions.
- The native YouTube title, channel avatar, share button, and end-screen recommendations are completely unreachable.

### Alternatives Considered
- **Hiding UI via CSS inside the IFrame**: Impossible due to cross-origin same-origin policy (SOP) restrictions on `youtube.com`.
- **Custom HTML5 `<video>` tag**: Rejected because YouTube video stream URLs are cipher-protected and not directly playable in a vanilla video tag without violating terms or running an unmaintainable proxy.

---

## 3. WebKit Autoplay & Audio Lifecycle on iOS Safari

### Decision
Gate initial playback on a single user tap on the overlay. After this initial gesture, preserve the player instance and use `player.loadVideoById()` for subsequent video navigations.

### Rationale
- Mobile Safari enforces strict autoplay policies: unmuted video cannot play programmatically without a user gesture.
- Re-creating the IFrame element resets the WebKit media element permission state, requiring another tap.
- Keeping a persistent `YT.Player` instance and invoking `loadVideoById({ videoId })` retains the unlocked audio session across all subsequent video transitions.

### Alternatives Considered
- **Multi-IFrame pool (pre-loading next video in a hidden iframe)**: While it could reduce buffering times, iOS Safari treats each iframe as a separate media context requiring its own gesture activation, causing unmuted audio to fail on swap.

---

## 4. Local-First Storage Architecture

### Decision
Use `idb-keyval` or a minimal (under 1 kB) IndexedDB wrapper with a fallback to `localStorage` for playlist persistence.

### Rationale
- Constitution Principle P4 mandates zero external backend dependencies.
- IndexedDB provides asynchronous, non-blocking storage that handles hundreds of items without causing main thread jank during touch gestures.
- Automatic fallback to `localStorage` ensures complete functionality in Private Browsing mode where IndexedDB might be restricted in older WebKit versions.

### Alternatives Considered
- **Raw `localStorage` exclusively**: While simple, synchronous stringification on large playlists can cause minor frame drops during swipe transitions.
- **Backend database (Supabase / Firebase)**: Prohibited by Constitution P4 (zero mandatory cloud backend).

---

## 5. Viewport & PWA Shell Architecture

### Decision
Use `100dvh` for full viewport height, `viewport-fit=cover`, `overscroll-behavior: none` on `body`, and `overscroll-behavior-y: contain` on the player container.

### Rationale
- Eliminates Safari's rubber-banding and pull-to-refresh without breaking touch event dispatch.
- `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)` ensure HUD pills and controls stay clear of the notch and home indicator bar.


---

## 6. Video Completion & Intentional Replay Mechanics

### Decision
Set `loop=0` on player parameters. When YouTube emits `YT.PlayerState.ENDED`, do NOT auto-advance and do NOT auto-loop. Enter paused/ended state and overlay a centered Replay button icon. Advance only when user executes vertical swipe.

### Rationale
- Clarified by user in `/speckit-clarify`.
- Loop-fatigue and passive auto-advancing are core triggers of doomscrolling. Stopping on the final frame with an explicit replay option forces conscious choice.

---

## 7. Aspect Ratio & Screen Fit (Containment Framing)

### Decision
Render standard 9:16 Shorts with containment scaling (`object-fit: contain` equivalent) centered on a solid `#000` background.

### Rationale
- Clarified by user in `/speckit-clarify`.
- Prevents cropping of creator captions, subtitles, or UI overlays placed near top/bottom edges on taller screens (e.g., 19.5:9 on iPhone 15/16).
