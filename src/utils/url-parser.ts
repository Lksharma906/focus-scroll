export type VideoInputFormat = 'shorts' | 'watch' | 'youtu.be' | 'embed' | 'raw-id' | 'invalid';

export interface ParseResult {
  valid: boolean;
  videoId: string | null;
  inputFormat: VideoInputFormat;
  errorMessage: string | null;
}

export function getYoutubeThumbnail(videoId: string, quality: 'default' | 'mq' | 'hq' = 'mq'): string {
  if (quality === 'mq') return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
  if (quality === 'hq') return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  return `https://img.youtube.com/vi/${videoId}/default.jpg`;
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

  // Shorts URL: youtube.com/shorts/<id> (handles www., m., etc., and trailing queries/slashes)
  const shortsRegex = /(?:https?:\/\/)?(?:[a-zA-Z0-9-]+\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/i;
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
  const watchRegex = /(?:https?:\/\/)?(?:[a-zA-Z0-9-]+\.)?youtube\.com\/watch\?(?:[^#\s]*&)?v=([a-zA-Z0-9_-]{11})/i;
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
  const youtbeRegex = /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})/i;
  const youtubeMatch = trimmed.match(youtbeRegex);
  if (youtubeMatch && youtubeMatch[1]) {
    return {
      valid: true,
      videoId: youtubeMatch[1],
      inputFormat: 'youtu.be',
      errorMessage: null
    };
  }

  // Embed URL: youtube.com/embed/<id>
  const embedRegex = /(?:https?:\/\/)?(?:[a-zA-Z0-9-]+\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/i;
  const embedMatch = trimmed.match(embedRegex);
  if (embedMatch && embedMatch[1]) {
    return {
      valid: true,
      videoId: embedMatch[1],
      inputFormat: 'embed',
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

/**
 * Extracts all valid YouTube video IDs from mixed text, multiline input,
 * or comma/space-separated list of URLs.
 */
export function extractAllVideoIds(raw: string): string[] {
  if (!raw || !raw.trim()) return [];

  const foundIds: string[] = [];
  const seen = new Set<string>();

  // Split tokens by newlines, commas, whitespace
  const tokens = raw.split(/[\r\n\s,]+/).filter(Boolean);

  for (const token of tokens) {
    const parsed = parseVideoInput(token);
    if (parsed.valid && parsed.videoId && !seen.has(parsed.videoId)) {
      seen.add(parsed.videoId);
      foundIds.push(parsed.videoId);
    }
  }

  // If no direct token matched, try searching globally with regexes in the entire raw string
  if (foundIds.length === 0) {
    const globalPatterns = [
      /(?:https?:\/\/)?(?:[a-zA-Z0-9-]+\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/gi,
      /(?:https?:\/\/)?(?:[a-zA-Z0-9-]+\.)?youtube\.com\/watch\?(?:[^#\s]*&)?v=([a-zA-Z0-9_-]{11})/gi,
      /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})/gi,
      /(?:https?:\/\/)?(?:[a-zA-Z0-9-]+\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/gi
    ];

    for (const pattern of globalPatterns) {
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(raw)) !== null) {
        if (match[1] && !seen.has(match[1])) {
          seen.add(match[1]);
          foundIds.push(match[1]);
        }
      }
    }
  }

  return foundIds;
}

export async function fetchVideoTitle(videoId: string): Promise<string> {
  const fallback = `Short (${videoId})`;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.title === 'string' && data.title.trim()) {
        return data.title.trim();
      }
    }
  } catch {
    // Network failure, offline, or CORS/timeout fallback
  }
  return fallback;
}
