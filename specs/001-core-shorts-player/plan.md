# Implementation Plan: FocusScroll Core Shorts Player

**Branch**: `001-core-shorts-player` | **Date**: 2026-09-07 | **Spec**: [specs/001-core-shorts-player/spec.md](spec.md)

**Input**: Feature specification from `specs/001-core-shorts-player/spec.md`

---

## Summary

Build the core FocusScroll application as a high-performance, distraction-free YouTube Shorts PWA optimized for mobile Safari on iOS. The application encapsulates the YouTube IFrame Player API behind an impenetrable event-capturing overlay layer (P1), executes custom vertical gesture detection with velocity snapping (P2), complies with WebKit audio unlock and session persistence policies (P3), and manages a local-first playlist store with strict URL parsing, session position restore, and JSON backup (P4), packaged in a lightweight Vite + TypeScript bundle ≤ 150 kB (P5).

Playback follows intentional play-once semantics: videos do not auto-loop or auto-advance on completion; instead, a centered replay button is shown until the user performs an intentional vertical swipe.

---

## Technical Context

**Language/Version**: TypeScript 5.x (`"strict": true`)  
**Primary Dependencies**: None (Vanilla TS runtime + `idb-keyval` ≤ 1 kB for IndexedDB)  
**Dev & Build Tooling**: Vite 5.x, Vitest, `@vite-pwa/plugin`, ESLint, Prettier  
**Storage**: IndexedDB with `localStorage` fallback (persisting `items` and `lastActiveIndex`)  
**Testing**: Vitest + jsdom for unit tests  
**Target Platform**: iOS 16+ WebKit / Mobile Safari PWA (`display: standalone`)  
**Project Type**: Progressive Web Application (PWA)  
**Performance Goals**: 60 fps card transitions, sub-16ms touch responsiveness, bundle ≤ 150 kB gzipped  
**Constraints**: Zero algorithmic leakage, zero analytics/tracking, offline shell capability  
**Scale/Scope**: Single PWA shell, 1 persistent playlist (up to 500 items), 1 active video player  

---

## Constitution Check

| Principle | Assessment | Notes |
|---|---|---|
| **P1 — Zero Algorithmic Leakage** | PASS | Full-coverage overlay with `pointer-events: none` on iframe prevents all native interactions; `rel=0`, `disablekb=1`, and `loop=0` enforced. |
| **P2 — Native-Grade Mobile Touch Mechanics** | PASS | Custom touch event handlers with velocity threshold (300 px/s) and displacement ratio (0.30); `overscroll-behavior-y: contain`; GPU translateY transitions. |
| **P3 — WebKit Autoplay Compliance** | PASS | First-touch gate unlocks audio context; single `YT.Player` instance is retained and updated via `loadVideoById()`. |
| **P4 — Local-First Storage** | PASS | Storage via IndexedDB/localStorage; strict regex parser; versioned JSON import/export (Replace vs Merge); 0 backend dependencies. |
| **P5 — Code Hygiene & Stack Constraints** | PASS | Vite + TypeScript strict, raw CSS, zero heavyweight frameworks, bundle target well under 150 kB. |

---

## Phase 0: Outline & Research

Completed. See [research.md](research.md). Key decisions:
1. Native touch event listeners with `{ passive: false }` for velocity and displacement calculation.
2. Full-coverage transparent overlay layer (`z-index: 10`) above YouTube IFrame (`z-index: 1`).
3. Single persistent player instance for continuous audio permission across video swaps.
4. IndexedDB storage via minimal wrapper with fallback to `localStorage` (storing `lastActiveIndex`).
5. Dynamic viewport units (`100dvh`), 9:16 containment framing on tall screens, and safe-area insets (`env(safe-area-inset-*)`).
6. Intentional play-once completion handling: on `ENDED`, reveal replay button without auto-advance or loop.

---

## Phase 1: Design & Contracts

Completed design artifacts:
- **Data Model**: [data-model.md](data-model.md)
- **Interface Contracts**:
  - [Player Controller Contract](contracts/player.ts)
  - [Gesture Engine Contract](contracts/gesture.ts)
  - [Storage Manager Contract](contracts/storage.ts)
- **Validation Guide**: [quickstart.md](quickstart.md)

---

## Phase 2: Implementation Roadmap

The implementation will be decomposed into sequential tasks (`tasks.md` via `/speckit-tasks`):
1. **Foundation & PWA Shell**: Vite setup, HTML meta tags, manifest, dynamic viewport layout, safe area styles, 9:16 containment.
2. **Storage & URL Ingestion Layer**: Local-first repository, seed loader, `lastActiveIndex` persistence, strict URL parser, JSON import/export modal (Replace vs Merge).
3. **Gesture & Touch Engine**: `touchstart`/`touchmove`/`touchend` tracker, velocity calculations, snap commit logic.
4. **Playback & IFrame Controller**: YouTube API loader, player wrapper, overlay isolation, audio unlock gate, centered replay button on video completion.
5. **HUD & Management Drawer**: Top position pill, buffering spinner, bottom sheet for playlist CRUD, clean onboarding empty state.
6. **Integration & Validation**: End-to-end wiring, unit tests, mobile Safari testing, bundle size check.

