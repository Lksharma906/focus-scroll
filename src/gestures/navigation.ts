export interface NavigationResult {
  nextIndex: number;
  wrapped: boolean;
  bounced: boolean;
}

export function calculateNextIndex(
  currentIndex: number,
  direction: 'up' | 'down',
  playlistLength: number
): NavigationResult {
  if (playlistLength <= 0) {
    return { nextIndex: 0, wrapped: false, bounced: false };
  }

  if (direction === 'up') {
    // Advancing forward
    if (currentIndex >= playlistLength - 1) {
      // Last item -> wrap to start
      return { nextIndex: 0, wrapped: true, bounced: false };
    }
    return { nextIndex: currentIndex + 1, wrapped: false, bounced: false };
  } else {
    // Navigating back
    if (currentIndex <= 0) {
      // First item -> bounce back
      return { nextIndex: 0, wrapped: false, bounced: true };
    }
    return { nextIndex: currentIndex - 1, wrapped: false, bounced: false };
  }
}
