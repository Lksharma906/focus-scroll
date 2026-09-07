<!--
SYNC IMPACT REPORT
==================
Version Change: N/A → 1.0.0 (initial ratification)
Modified Principles: None (initial creation)
Added Sections:
  - §1 Project Identity & Mission
  - §2 Core Principles & Non-Negotiables (P1–P5)
  - §3 Security & Distraction-Free Guardrails (G1–G7)
  - §4 Tech Stack & Platform Constraints (iOS WebKit specifics)
  - §5 State & Media Management Standards
  - §6 Definition of Done (DoD)
  - §7 Governance
Removed Sections: N/A (initial)
Templates Requiring Updates:
  - .specify/templates/plan-template.md  ✅ aligned
  - .specify/templates/spec-template.md  ✅ aligned
  - .specify/templates/tasks-template.md ✅ aligned
-->

# FocusScroll — Project Constitution

**Version:** 1.0.0  
**Ratification Date:** 2026-09-07  
**Last Amended:** 2026-09-07  
**Status:** Active  

---

## §0 Preamble

This Constitution is the supreme governance document for the **FocusScroll** project. Every feature specification, implementation plan, and task list MUST be evaluated against these principles. Conflicts between a feature request and this Constitution MUST be resolved in favor of the Constitution; deviations require a formal amendment.

---

## §1 Project Identity & Mission

**Name:** FocusScroll — Distraction-Free Curated Shorts PWA  
**Core Purpose:** Personal, anti-doomscrolling Progressive Web App (PWA) optimized for mobile Safari on iOS ("Add to Home Screen"). It replaces algorithmic infinite feeds by restricting vertical swipe playback exclusively to a user-curated, predetermined list of YouTube Shorts.  
**Primary Platform:** iOS WebKit / Mobile Safari (standalone PWA mode).  
**Guiding Philosophy:** The user, not the algorithm, decides what to watch. Every architectural and UX decision MUST reinforce intentional, finite engagement and MUST actively prevent YouTube's recommendation engine from regaining influence over the user's attention.

---

## §2 Core Principles & Non-Negotiables

### P1 — Zero Algorithmic Leakage *(Primary Invariant)*
The YouTube recommendation engine, channel links, comments, related videos, and native swipe gestures MUST be completely unreachable and unclickable at all times.
- The YouTube IFrame MUST be rendered behind a full-coverage, non-interactive overlay that captures all pointer and touch events before they reach the iframe's native UI.
- `pointer-events: none` MUST be applied to the IFrame wrapper element, backed by an active event-capturing overlay layer.
- `rel=0` MUST be configured to suppress related-video end screens.
- `disablekb=1` MUST be configured to prevent keyboard shortcut UI triggers.
- In-app deep-links or external navigations to `youtube.com` within the PWA shell are strictly forbidden.

### P2 — Native-Grade Mobile Touch Mechanics
Touch interactions MUST match the fidelity and responsiveness of native short-video apps (TikTok, Reels, Shorts).
- Custom vertical swipe gesture detection MUST be implemented using the raw `touchstart`, `touchmove`, and `touchend` event triad.
- Swipe commits MUST use velocity/distance threshold snapping: velocity ≥ 300 px/s OR displacement ≥ 30% of viewport height triggers a snap.
- `overscroll-behavior-y: contain` and `overscroll-behavior: none` MUST be applied to eliminate browser pull-to-refresh and rubber-banding.
- `user-select: none` and `-webkit-user-select: none` MUST be enforced globally to prevent text selection during swipes.
- The viewport MUST strictly respect iOS dynamic safe areas via `env(safe-area-inset-*)`.
- The PWA manifest MUST declare `"display": "standalone"` to eliminate Safari browser chrome.
- All animated card transitions MUST use GPU-accelerated `transform: translateY()` exclusively with `will-change: transform`.

### P3 — WebKit Autoplay & Audio Lifecycle Compliance
Media playback MUST comply with iOS Safari's strict media policies without degrading user experience.
- The initial video play and unmuting transition MUST be gated on a verified explicit user gesture (first tap). No audio MUST play before this gate has been opened in a browsing session.
- Once unlocked, the audio context MUST be preserved across all programmatic video swaps. The IFrame player instance MUST NOT be destroyed and recreated between video navigations; video IDs MUST be swapped via `loadVideoById()` on the existing player instance.
- A clean, unobtrusive "Tap to play" prompt UI MUST be displayed on first load to solicit the unlock gesture, and MUST be dismissed upon audio activation.

### P4 — Local-First & Zero-Friction Storage
User data MUST be stored locally with zero mandatory network dependencies beyond video stream delivery.
- The playlist MUST be persisted locally in `IndexedDB` (preferred) or `localStorage` (fallback). Zero mandatory backend, authentication, or external API dependencies are permitted for list management.
- Video ingestion MUST accept and sanitize:
  - Full Shorts URLs: `https://www.youtube.com/shorts/<ID>`
  - Standard watch URLs: `https://www.youtube.com/watch?v=<ID>`
  - Youtu.be shortlinks: `https://youtu.be/<ID>`
  - Raw 11-character video IDs (`^[a-zA-Z0-9_-]{11}$`)
- Input validation MUST be strict; invalid inputs must surface human-readable validation errors.
- Data portability: The app MUST support versioned JSON export and import for user playlist backups.
- No telemetry, third-party trackers, or analytics SDKs are allowed.

### P5 — Code Hygiene & Tech Stack Constraints
- **Build & Language:** Vite with TypeScript strict mode (`"strict": true`).
- **UI Architecture:** Vanilla TypeScript or lightweight reactive primitives (e.g. signals/nanostores ≤ 5 kB). Zero heavy UI component frameworks (no React, Vue, Angular, or Svelte runtime without formal amendment).
- **Styling:** Modern raw CSS with CSS custom properties; no heavy utility-class frameworks.
- **Bundle Budget:** Production bundle (JS + CSS, gzipped) MUST NOT exceed 150 kB (excluding the YouTube IFrame API script loaded from CDN).
- **Testing:** Deterministic unit tests (Vitest) for gesture calculations, URL parsing, and state transitions.

---

## §3 Security & Distraction-Free Guardrails

| ID | Guardrail | Enforcement Mechanism |
|---|---|---|
| G1 | YouTube native UI elements blocked | Transparent overlay with higher z-index + `pointer-events: none` on iframe |
| G2 | No outbound navigation to YouTube | Anchor click interception blocks and drops any `youtube.com` / `youtu.be` links |
| G3 | Embed parameters enforced | `controls=0`, `rel=0`, `modestbranding=1`, `disablekb=1`, `playsinline=1` on player creation |
| G4 | Strict Content Security Policy | CSP meta tag restricts `frame-src` to `*.youtube.com` and `*.ytimg.com` |
| G5 | Zero tracking / analytics | No third-party analytics or advertising scripts in bundle or CSP |
| G6 | Local-only data transmission | No external `fetch`/XHR calls for playlist CRUD |
| G7 | Strict 11-char ID validation | Regex allowlist `^[a-zA-Z0-9_-]{11}$` checked before storage and playback |

---

## §4 Tech Stack & Platform Constraints

- **Build:** Vite ≥ 5.x
- **Language:** TypeScript ≥ 5.x (`strict: true`)
- **UI Reactivity:** Vanilla TS or micro-library (≤ 5 kB)
- **CSS:** Native CSS + CSS custom properties + Safe Area Insets (`env(safe-area-inset-*)`)
- **Storage:** IndexedDB / localStorage fallback
- **Testing:** Vitest + jsdom
- **Platform Specifics (iOS WebKit):** `viewport-fit=cover`, `100dvh`, `-webkit-touch-callout: none`

---

## §5 State & Media Management Standards

### 5.1 Data Model
```typescript
interface VideoEntry {
  id: string;        // 11-character YouTube video ID
  addedAt: number;   // Timestamp (epoch ms)
  title?: string;    // Optional user-specified label
}
```

### 5.2 Player State Machine
```
IDLE → GESTURE_UNLOCK → PLAYING ↔ PAUSED
                          ↕
                   SWIPE_IN_PROGRESS
                          ↓
                    TRANSITIONING
                          ↓
                       PLAYING
```

---

## §6 Definition of Done (DoD)

Before any feature is merged or released, it must satisfy:
1. **P1 Invariant Verified:** Tap-exploration confirms no YouTube native UI or recommendations are accessible.
2. **Touch Mechanics Verified:** Velocity (≥ 300 px/s) and displacement (≥ 30%) snap thresholds operate smoothly with 0 rubber-banding.
3. **Audio Continuity Verified:** Initial tap unlocks audio; transitions maintain unmuted audio without recreating player instances.
4. **Local-First Verified:** Adding, removing, and reordering persists across full page reloads with 0 external network requests.
5. **Quality & Performance:** TypeScript strict passes with 0 errors, Vitest unit tests pass, bundle size ≤ 150 kB gzipped.

---

## §7 Governance

- **Amendment Policy:** Any change to core principles P1–P5 requires a MAJOR version bump (e.g. 1.0.0 → 2.0.0) and project owner review.
- **Precedence:** Constitution (`constitution.md`) > Specification (`spec.md`) > Plan (`plan.md`) > Tasks (`tasks.md`).

**Version:** 1.0.0 | **Ratified:** 2026-09-07 | **Last Amended:** 2026-09-07
