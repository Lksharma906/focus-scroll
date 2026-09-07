# Tasks: FocusScroll Core Shorts Player

**Feature Branch**: `001-core-shorts-player`  
**Input**: Design documents from `specs/001-core-shorts-player/` (`plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`)  
**Status**: Ready for Implementation (Clarifications Integrated)  

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize repository tooling, TypeScript configuration, and development environment.

- [X] T001 Initialize Vite + TypeScript project with strict mode in root (`package.json`, `tsconfig.json`, `vite.config.ts`)
- [X] T002 Configure Vite PWA plugin with standalone manifest and mobile icons in `vite.config.ts`
- [X] T003 [P] Configure Vitest and jsdom test environment in `vitest.config.ts`
- [X] T004 [P] Copy TypeScript interface contracts into source directory `src/types/` (`contracts/player.ts`, `contracts/gesture.ts`, `contracts/storage.ts`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core layout, viewport isolation, and base styles required before implementing user stories.

- [X] T005 Setup HTML shell in `index.html` with viewport metadata (`viewport-fit=cover`), Apple touch meta tags, and CSP policy
- [X] T006 Implement base styling in `src/styles/main.css` establishing `100dvh` container, containment letterboxing for 9:16 video on tall screens, safe-area insets (`env(safe-area-inset-*)`), and global overscroll lock (`overscroll-behavior: none`)
- [X] T007 [P] Implement storage repository in `src/storage/db.ts` utilizing IndexedDB with localStorage fallback per `data-model.md` (supporting `lastActiveIndex`)
- [X] T008 [P] Implement seed playlist loader utility in `src/storage/seed.ts` providing 3 curated public Shorts
- [X] T009 [P] Implement unit tests for storage layer, `lastActiveIndex` persistence, and seed utility in `tests/unit/storage.test.ts`

**Checkpoint**: Foundation ready. User stories can now be implemented.

---

## Phase 3: User Story 1 - Fullscreen Intentional Playback with Audio Unlock (Priority: P1) 🎯 MVP

**Goal**: Deliver distraction-free playback of curated shorts with zero algorithmic leakage, WebKit-compliant audio unlocking, and intentional non-looping video completion.

**Independent Test**: Launch the app, observe "Tap to play" prompt, tap to unlock unmuted playback, verify that all YouTube native UI is blocked from touch, and verify that video end displays a replay button without auto-advancing or looping.

### Tests for User Story 1
- [X] T010 [P] [US1] Unit tests for player controller state machine transitions (including `ENDED` state replay prompt) in `tests/unit/player-state.test.ts`
- [X] T011 [P] [US1] Contract test for IFrame sandbox parameter generation (`loop=0`, `controls=0`, `rel=0`) in `tests/unit/iframe-config.test.ts`

### Implementation for User Story 1
- [X] T012 [US1] Implement dynamic YouTube IFrame API script loader in `src/player/yt-loader.ts`
- [X] T013 [US1] Implement Player Controller in `src/player/controller.ts` managing single persistent `YT.Player` instance, `loadVideoById()`, `loop=0`, and state dispatch
- [X] T014 [US1] Implement full-coverage transparent touch overlay component in `src/components/overlay.ts` intercepting 100% of pointer events (P1 Invariant)
- [X] T015 [US1] Implement "Tap to play" audio unlock prompt UI and gesture-binding in `src/components/audio-gate.ts` (P3 Compliance)
- [X] T016 [US1] Implement single-tap Play/Pause toggle with animated center pause icon in `src/components/pause-indicator.ts`
- [X] T017 [US1] Implement centered Replay Button overlay on video completion (`ENDED` state), preventing auto-advance or auto-loop per user clarification
- [X] T018 [US1] Handle player error events (codes 100, 101, 150) with auto-skip and notification in `src/player/controller.ts`

**Checkpoint**: MVP is fully functional. Single video unmuted playback is active with 0 algorithmic exposure and intentional play-once semantics.

---

## Phase 4: User Story 2 - Native-Feeling Vertical Snap Navigation (Priority: P2)

**Goal**: Seamless vertical swipe interactions between playlist videos with momentum snapping, session position resume, and zero rubber-banding.

**Independent Test**: Perform vertical swipes; verify snappy transitions at velocity ≥ 300 px/s or 30% viewport height displacement, bounce-back on first item, loop on last item, and session position persistence across reloads.

### Tests for User Story 2
- [X] T019 [P] [US2] Unit tests for gesture physics calculation (velocity & displacement thresholds) in `tests/unit/gesture-math.test.ts`
- [X] T020 [P] [US2] Unit tests for playlist navigation boundaries and active index persistence in `tests/unit/navigation.test.ts`

### Implementation for User Story 2
- [X] T021 [US2] Implement native touch gesture detector (`touchstart`, `touchmove`, `touchend`) in `src/gestures/engine.ts`
- [X] T022 [US2] Implement velocity and displacement snap evaluation logic in `src/gestures/thresholds.ts`
- [X] T023 [US2] Implement hardware-accelerated card transition animations via `transform: translateY()` in `src/components/feed.ts`
- [X] T024 [US2] Wire gesture commit events to `PlayerController.loadVideo()`, update `lastActiveIndex` in storage, and lock input during `TRANSITIONING` state
- [X] T025 [US2] Implement playlist boundary navigation (first video bounce-back, last video loop wrap with toast) in `src/components/feed.ts`
- [X] T026 [US2] Implement app startup position restore from `lastActiveIndex` in `src/components/feed.ts`

**Checkpoint**: Vertical swipe feed matches native short-video feel without browser rubber-banding and resumes where the user left off.

---

## Phase 5: User Story 3 - Local-First Playlist Management & Ingestion (Priority: P3)

**Goal**: Full offline playlist CRUD, multi-format YouTube URL/ID parser, clean onboarding state, and JSON backup export/import with Replace vs Merge dialog.

**Independent Test**: Test clean onboarding screen; add URLs in multiple formats; test import modal with Replace and Merge choices; reorder and delete items.

### Tests for User Story 3
- [X] T027 [P] [US3] Unit tests for regex URL/ID parser covering all valid and invalid patterns in `tests/unit/url-parser.test.ts`
- [X] T028 [P] [US3] Unit tests for JSON export and import schema validation (including Replace vs Merge resolution) in `tests/unit/export-import.test.ts`

### Implementation for User Story 3
- [X] T029 [US3] Implement clean onboarding empty-state component in `src/components/onboarding.ts` with "Load sample videos" and "Add a video" actions
- [X] T030 [US3] Implement strict URL/ID parser utility in `src/utils/url-parser.ts` supporting `/shorts/<id>`, `watch?v=<id>`, `youtu.be/<id>`, and raw IDs
- [X] T031 [US3] Implement slide-up playlist management drawer UI in `src/components/drawer.ts` with item list, delete button, and add-video input
- [X] T032 [US3] Implement drag-and-drop or handle-based reordering in `src/components/drawer.ts` updating `PlaylistStore`
- [X] T033 [US3] Implement JSON export file generation (`schema: "1.0.0"`) and file-picker import modal offering "Replace existing" vs "Merge unique items" in `src/storage/backup.ts`
- [X] T034 [US3] Wire drawer playlist modifications to active playback (auto-advance if current video deleted)

**Checkpoint**: Complete local curation cycle functional with zero server dependencies and clean user control.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Visual feedback, heads-up display, accessibility, and bundle budget enforcement.

- [X] T035 [P] Implement top position indicator pill (`e.g. 3 / 10`) with 3-second auto-fade in `src/components/hud.ts`
- [X] T036 [P] Implement buffering spinner overlay responding to player buffer stalls in `src/components/spinner.ts`
- [X] T037 [P] Implement transient auto-dismissing toast notification system in `src/components/toast.ts`
- [X] T038 Audit accessibility compliance (visible focus states, ARIA labels on controls)
- [X] T039 Run production build (`npm run build`) and verify bundle size is ≤ 150 kB gzipped (Constitution P5)
- [X] T040 Execute full test suite (`npm run test`) and verify 100% pass rate

---

## Dependencies & Execution Order

```
Phase 1 (Setup) ──► Phase 2 (Foundational)
                         │
                         ▼
             Phase 3 (US1: MVP Playback)
                         │
                         ▼
             Phase 4 (US2: Touch & Swipe)
                         │
                         ▼
             Phase 5 (US3: Playlist CRUD)
                         │
                         ▼
             Phase 6 (HUD, Polish & Audit)
```

---

## Parallel Execution Opportunities

- **Phase 1 (Setup)**: T003 (`vitest.config.ts`) and T004 (`src/types/`) can be worked on in parallel after T001/T002.
- **Phase 2 (Foundational)**: T007 (`src/storage/db.ts`) and T008 (`src/storage/seed.ts`) can run in parallel with T005 (`index.html`) and T006 (`src/styles/main.css`).
- **Phase 3 (User Story 1)**: T010/T011 (unit & contract tests) can be written in parallel before implementation. T014 (`src/components/overlay.ts`), T015 (`src/components/audio-gate.ts`), and T016 (`src/components/pause-indicator.ts`) are independent UI components that can be constructed in parallel.
- **Phase 4 (User Story 2)**: T018 (`tests/unit/gesture-math.test.ts`) and T019 (`tests/unit/navigation.test.ts`) can run in parallel before T021.
- **Phase 5 (User Story 3)**: T027 (`tests/unit/url-parser.test.ts`) and T028 (`tests/unit/export-import.test.ts`) can run in parallel with T029 (`src/components/onboarding.ts`).
- **Phase 6 (Polish)**: T035 (`src/components/hud.ts`), T036 (`src/components/spinner.ts`), and T037 (`src/components/toast.ts`) can be built completely in parallel.

---

## Implementation Strategy

1. **MVP First (Phases 1, 2, 3)**:
   - Establish Vite + TypeScript project.
   - Setup layout, IFrame loader, gesture overlay, and audio unlock gate.
   - **Result**: Working MVP where a user can open the PWA, tap once to unlock audio, and watch a single video with 100% isolation from native YouTube UI.
2. **Incremental Delivery (Phase 4)**:
   - Introduce native touch event detection, velocity calculation, and translateY animation.
   - **Result**: Full vertical swipe experience matching native mobile apps.
3. **Curator Expansion (Phase 5)**:
   - Introduce the playlist drawer, regex ingestion parser, and JSON backup.
   - **Result**: Complete standalone offline-first playlist curation.
4. **Final Polish (Phase 6)**:
   - Add position pill, buffering spinner, toasts, accessibility, and bundle budget audit.
