export interface YouTubePlayerVars {
  controls: number;
  rel: number;
  modestbranding: number;
  playsinline: number;
  fs: number;
  disablekb: number;
  loop: number;
  iv_load_policy: number;
  origin: string;
}

export function buildYouTubePlayerVars(): YouTubePlayerVars {
  return {
    controls: 0,
    rel: 0,
    modestbranding: 1,
    playsinline: 1,
    fs: 0,
    disablekb: 1,
    loop: 0, // Play-once clarified requirement
    iv_load_policy: 3, // Suppress annotations
    origin: typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
  };
}

let apiPromise: Promise<void> | null = null;

export function loadYouTubeIFrameAPI(): Promise<void> {
  if (apiPromise) {
    return apiPromise;
  }

  if (typeof window !== 'undefined' && (window as unknown as { YT?: { Player: unknown } }).YT?.Player) {
    return Promise.resolve();
  }

  apiPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector('script[src*="youtube.com/iframe_api"]');
    if (existing) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;

    (window as unknown as { onYouTubeIframeAPIReady?: () => void }).onYouTubeIframeAPIReady = () => {
      resolve();
    };

    script.onerror = () => {
      reject(new Error('Failed to load YouTube IFrame Player API. Check network connection.'));
    };

    document.head.appendChild(script);
  });

  return apiPromise;
}
