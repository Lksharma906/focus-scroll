import { VideoEntry } from '../types/storage';

export interface SchemaValidationResult {
  valid: boolean;
  items: VideoEntry[];
  error?: string;
}

export function validateExportSchema(rawJson: string): SchemaValidationResult {
  try {
    const parsed = JSON.parse(rawJson);
    if (!parsed || !parsed.schema || !Array.isArray(parsed.playlist)) {
      return {
        valid: false,
        items: [],
        error: 'Malformed JSON: Missing schema or playlist property.'
      };
    }

    const major = String(parsed.schema).split('.')[0];
    if (major !== '1') {
      return {
        valid: false,
        items: [],
        error: `Unsupported schema major version ${major}. Only v1.x is supported.`
      };
    }

    const idRegex = /^[a-zA-Z0-9_-]{11}$/;
    const validItems: VideoEntry[] = [];

    for (const item of parsed.playlist) {
      if (item && typeof item.id === 'string' && idRegex.test(item.id)) {
        validItems.push({
          id: item.id,
          addedAt: typeof item.addedAt === 'number' ? item.addedAt : Date.now(),
          title: typeof item.title === 'string' ? item.title.slice(0, 100) : undefined
        });
      }
    }

    return {
      valid: true,
      items: validItems
    };
  } catch (err) {
    return {
      valid: false,
      items: [],
      error: err instanceof Error ? err.message : 'Invalid JSON file'
    };
  }
}

export function triggerDownload(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
