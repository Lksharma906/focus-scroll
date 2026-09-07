export interface ParseResult {
  valid: boolean;
  videoId: string | null;
  inputFormat: 'shorts' | 'watch' | 'youtu.be' | 'raw-id' | 'invalid';
  errorMessage: string | null;
}

export function parseVideoInput(raw: string): ParseResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      valid: false,
      videoId: null,
      inputFormat: 'invalid',
      errorMessage: 'Please enter a video URL or ID.'
    };
  }

  // Raw 11-char ID
  const rawIdRegex = /^[a-zA-Z0-9_-]{11}$/;
  if (rawIdRegex.test(trimmed)) {
    return {
      valid: true,
      videoId: trimmed,
      inputFormat: 'raw-id',
      errorMessage: null
    };
  }

  // Shorts URL: youtube.com/shorts/<id>
  const shortsRegex = /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/;
  const shortsMatch = trimmed.match(shortsRegex);
  if (shortsMatch && shortsMatch[1]) {
    return {
      valid: true,
      videoId: shortsMatch[1],
      inputFormat: 'shorts',
      errorMessage: null
    };
  }

  // Standard watch URL: youtube.com/watch?v=<id>
  const watchRegex = /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/;
  const watchMatch = trimmed.match(watchRegex);
  if (watchMatch && watchMatch[1]) {
    return {
      valid: true,
      videoId: watchMatch[1],
      inputFormat: 'watch',
      errorMessage: null
    };
  }

  // youtu.be shortlink: youtu.be/<id>
  const youtbeRegex = /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})/;
  const youtubeMatch = trimmed.match(youtbeRegex);
  if (youtubeMatch && youtubeMatch[1]) {
    return {
      valid: true,
      videoId: youtubeMatch[1],
      inputFormat: 'youtu.be',
      errorMessage: null
    };
  }

  return {
    valid: false,
    videoId: null,
    inputFormat: 'invalid',
    errorMessage: 'Invalid YouTube video link or ID. Please check the URL format.'
  };
}
