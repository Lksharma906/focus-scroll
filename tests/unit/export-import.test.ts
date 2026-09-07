import { describe, it, expect } from 'vitest';
import { validateExportSchema } from '../../src/storage/backup';

describe('validateExportSchema', () => {
  it('accepts valid schema v1.0.0 payloads', () => {
    const validJson = JSON.stringify({
      schema: '1.0.0',
      exportedAt: new Date().toISOString(),
      playlist: [{ id: 'dQw4w9WgXcQ', addedAt: 12345 }]
    });
    const result = validateExportSchema(validJson);
    expect(result.valid).toBe(true);
    expect(result.items.length).toBe(1);
  });

  it('rejects payloads missing schema or playlist', () => {
    expect(validateExportSchema('{}').valid).toBe(false);
    expect(validateExportSchema('not json').valid).toBe(false);
  });

  it('rejects payloads with major version != 1', () => {
    const invalidJson = JSON.stringify({
      schema: '2.0.0',
      playlist: []
    });
    const result = validateExportSchema(invalidJson);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('major version');
  });
});
