# Quickstart Validation Guide: FocusScroll Core Shorts Player

**Feature**: `001-core-shorts-player`  
**Date**: 2026-09-07  

---

## Prerequisites
- Node.js ≥ 18.x
- iOS device running Safari on iOS 16+ (or macOS Safari responsive simulation / Xcode Simulator)

---

## Setup & Running Locally

```bash
# Install dependencies
npm install

# Start development server with network exposure for mobile testing
npm run dev -- --host

# Run test suite
npm run test
```

---

## Validation Scenarios

### 1. Zero Algorithmic Leakage & Isolation
1. Open the app in Safari (`http://<local-ip>:5173`).
2. Tap anywhere on the video area during playback.
3. **Verify:** No YouTube native interface, channel links, comments, or related videos appear or trigger navigation. Tapping toggles Play/Pause.

### 2. Audio Unlock Gate & Persistence
1. Refresh the page to simulate a fresh session.
2. Observe the "Tap to play" prompt on top of the muted video.
3. Tap the screen once.
4. **Verify:** Audio begins playing immediately.
5. Swipe up to the next video.
6. **Verify:** The next video begins playing with audio automatically without requiring a second tap.

### 3. Vertical Swipe Navigation
1. Swipe up with a fast flick (velocity ≥ 300 px/s).
2. **Verify:** Card slides smoothly upwards via CSS transform and settles on the next video.
3. Drag halfway slowly (less than 30% viewport height) and release.
4. **Verify:** Card springs back to the current video without advancing.
5. Drag down on the first video.
6. **Verify:** View bounces back and a "First video" toast appears.

### 4. Playlist Management & URL Parsing
1. Tap the settings/playlist button to open the bottom drawer.
2. Test adding each of these formats:
   - `https://www.youtube.com/shorts/dQw4w9WgXcQ`
   - `https://youtu.be/dQw4w9WgXcQ`
   - `dQw4w9WgXcQ` (raw ID)
3. **Verify:** Each extracts `dQw4w9WgXcQ`. Adding a duplicate shows "This video is already in your list".
4. Export JSON and inspect the downloaded file structure.
5. Delete an item and verify the list updates and persists across page reloads.

### 5. iOS PWA Add to Home Screen
1. On iPhone Safari, tap the Share icon → "Add to Home Screen".
2. Launch FocusScroll from the home screen icon.
3. **Verify:** Launches in borderless standalone mode without Safari address bar, respects the top notch, and prevents pull-to-refresh.
