import { describe, it, expect } from 'vitest';
import { parseVideoInput, extractAllVideoIds, getYoutubeThumbnail } from '../../src/utils/url-parser';

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

  it('parses user reported Short link R8NWqnqJxz0 with query params and mobile domains', () => {
    const r1 = parseVideoInput('https://www.youtube.com/shorts/R8NWqnqJxz0');
    expect(r1.valid).toBe(true);
    expect(r1.videoId).toBe('R8NWqnqJxz0');
    expect(r1.inputFormat).toBe('shorts');

    const r2 = parseVideoInput('https://www.youtube.com/shorts/R8NWqnqJxz0?feature=share&si=abc123xyz');
    expect(r2.valid).toBe(true);
    expect(r2.videoId).toBe('R8NWqnqJxz0');

    const r3 = parseVideoInput('https://m.youtube.com/shorts/R8NWqnqJxz0/');
    expect(r3.valid).toBe(true);
    expect(r3.videoId).toBe('R8NWqnqJxz0');
  });

  it('rejects invalid domains, empty strings, and malformed strings', () => {
    expect(parseVideoInput('').valid).toBe(false);
    expect(parseVideoInput('https://vimeo.com/123456789').valid).toBe(false);
    expect(parseVideoInput('https://youtube.com/user/channel').valid).toBe(false);
    expect(parseVideoInput('shortID').valid).toBe(false); // < 11 chars
    expect(parseVideoInput('thisisaverylonginvalidsomething').valid).toBe(false);
  });

  it('parses embed URLs', () => {
    const result = parseVideoInput('https://www.youtube.com/embed/dQw4w9WgXcQ');
    expect(result.valid).toBe(true);
    expect(result.videoId).toBe('dQw4w9WgXcQ');
    expect(result.inputFormat).toBe('embed');
  });
});

describe('extractAllVideoIds and getYoutubeThumbnail', () => {
  it('extracts multiple IDs from multiline and mixed text input', () => {
    const raw = `
      Check out this short https://youtube.com/shorts/3l8T_4nJ1vM!
      Also here is another one: https://youtu.be/dQw4w9WgXcQ?t=5
      And a third: 9bZkp7q19f0
    `;
    const ids = extractAllVideoIds(raw);
    expect(ids).toContain('3l8T_4nJ1vM');
    expect(ids).toContain('dQw4w9WgXcQ');
    expect(ids).toContain('9bZkp7q19f0');
    expect(ids.length).toBe(3);
  });

  it('deduplicates repetitive IDs in batch input', () => {
    const raw = 'https://youtu.be/dQw4w9WgXcQ, dQw4w9WgXcQ, https://www.youtube.com/shorts/dQw4w9WgXcQ';
    const ids = extractAllVideoIds(raw);
    expect(ids).toEqual(['dQw4w9WgXcQ']);
  });

  it('generates correct YouTube thumbnail URLs', () => {
    const mq = getYoutubeThumbnail('dQw4w9WgXcQ', 'mq');
    expect(mq).toBe('https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg');
    const hq = getYoutubeThumbnail('dQw4w9WgXcQ', 'hq');
    expect(hq).toBe('https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
  });
});
