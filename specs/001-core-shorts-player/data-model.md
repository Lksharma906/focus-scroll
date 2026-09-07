# Data Model: FocusScroll Core Shorts Player

**Feature**: `001-core-shorts-player`  
**Date**: 2026-09-07  

---

## 1. Core Entities

### VideoEntry
Represents an individual YouTube Short item in the playlist.

| Field | Type | Required | Description | Validation |
|---|---|---|---|---|
| `id` | `string` | Yes | 11-character YouTube video identifier | `^[a-zA-Z0-9_-]{11}$` |
| `addedAt` | `number` | Yes | Epoch timestamp (milliseconds) | Positive integer |
| `title` | `string` | No | User-provided descriptive title | Max 100 characters |

### PlaylistStore
The root persistent store representing the user's curated playlist state.

| Field | Type | Required | Description |
|---|---|---|---|
| `version` | `number` | Yes | Data model schema version (current: `1`) |
| `items` | `Array<VideoEntry>` | Yes | Ordered array of playlist entries |
| `lastActiveIndex` | `number` | Yes | Persisted 0-indexed position of the last viewed video (default: `0`) |
| `updatedAt` | `number` | Yes | Last modification timestamp in milliseconds |

### ExportPayload
The portable JSON backup schema for playlist export/import.

| Field | Type | Required | Description |
|---|---|---|---|
| `schema` | `string` | Yes | Semantic version string (`"1.0.0"`) |
| `exportedAt` | `string` | Yes | ISO-8601 formatted timestamp |
| `playlist` | `Array<VideoEntry>` | Yes | Array of exported video records |

---

## 2. State Models

### PlayerState
The playback engine state machine:

```
[ IDLE ]
   │  (initial launch or playlist empty)
   ▼
[ GESTURE_UNLOCK ]
   │  (user tap on viewport)
   ▼
[ PLAYING ] ◄──────────────► [ PAUSED ]
   │   ▲ (single tap)           ▲
   │   │                        │
   │ (swipe initiated)          │ (video ended: show replay button)
   ▼   │                        │
[ SWIPE_IN_PROGRESS ]           │
   │                            │
   │ (snap threshold met)       │
   ▼                            │
[ TRANSITIONING ]               │
   │ (video swapped)            │
   ▼                            │
[ PLAYING ] ────────────────────┘
```

### BufferState
- `isBuffering: boolean`: Transitions to `true` when the YouTube player fires `YT.PlayerState.BUFFERING` for > 500 ms; transitions back to `false` on `YT.PlayerState.PLAYING`.

---

## 3. Validation & Invariants

1. **Unique IDs**: No duplicate `id` values can exist simultaneously within `PlaylistStore.items`.
2. **Order Preservation**: Array index determines exact sequential playback order.
3. **Atomic Persistence**: Any mutation (add, delete, reorder, active index update) writes to IndexedDB/localStorage immediately.
4. **No Auto-Loop**: Individual videos play once to completion, transition to `PAUSED`/`ENDED` with replay prompt, and do not advance without touch gesture.
