import { describe, it, expect } from 'vitest';
import { parseVideoInput } from '../../src/utils/url-parser';

describe('parseVideoInput', () => {
  it('parses raw 11-character video IDs', () => {
    const result = parseVideoInput('dQw4w9WgXcQ');
    expect(result.valid).toBe(true);
    expect(result.videoId).toBe('dQw4w9WgXcQ');
    expect(result.inputFormat).toBe('raw-id');
  });

  it('parses full Shorts URLs', () => {
    const result = parseVideoInput('https://www.youtube.com/shorts/dQw4w9WgXcQ');
    expect(result.valid).toBe(true);
    expect(result.videoId).toBe('dQw4w9WgXcQ');
    expect(result.inputFormat).toBe('shorts');
  });

  it('parses standard watch URLs with query parameters', () => {
    const result = parseVideoInput('https://www.youtube.com/watch?v=dQw4w9WgXcQ&feature=share');
    expect(result.valid).toBe(true);
    expect(result.videoId).toBe('dQw4w9WgXcQ');
    expect(result.inputFormat).toBe('watch');
  });

  it('parses youtu.be shortlinks', () => {
    const result = parseVideoInput('https://youtu.be/dQw4w9WgXcQ?t=10');
    expect(result.valid).toBe(true);
    expect(result.videoId).toBe('dQw4w9WgXcQ');
    expect(result.inputFormat).toBe('youtu.be');
  });

  it('rejects invalid domains, empty strings, and malformed strings', () => {
    expect(parseVideoInput('').valid).toBe(false);
    expect(parseVideoInput('https://vimeo.com/123456789').valid).toBe(false);
    expect(parseVideoInput('https://youtube.com/user/channel').valid).toBe(false);
    expect(parseVideoInput('shortID').valid).toBe(false); // < 11 chars
    expect(parseVideoInput('thisisaverylonginvalidsomething').valid).toBe(false);
  });
});
