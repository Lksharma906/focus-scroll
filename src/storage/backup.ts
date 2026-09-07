import { VideoEntry } from '../types/storage';

export interface SchemaValidationResult {
  valid: boolean;
  items: VideoEntry[];
  lists?: Array<{
    id: string;
    name: string;
    items: VideoEntry[];
    lastActiveIndex?: number;
  }>;
  activeListId?: string;
  error?: string;
}

export function validateExportSchema(rawJson: string): SchemaValidationResult {
  try {
    const parsed = JSON.parse(rawJson);
    if (!parsed || !parsed.schema || (!Array.isArray(parsed.playlist) && !Array.isArray(parsed.lists))) {
      return {
        valid: false,
        items: [],
        error: 'Malformed JSON: Missing schema, lists, or playlist property.'
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

    // Parse legacy or root playlist items
    if (Array.isArray(parsed.playlist)) {
      for (const item of parsed.playlist) {
        if (item && typeof item.id === 'string' && idRegex.test(item.id)) {
          validItems.push({
            id: item.id,
            addedAt: typeof item.addedAt === 'number' ? item.addedAt : Date.now(),
            title: typeof item.title === 'string' ? item.title.slice(0, 100) : undefined
          });
        }
      }
    }

    // Parse unified lists
    let validatedLists: SchemaValidationResult['lists'] = undefined;
    if (Array.isArray(parsed.lists)) {
      validatedLists = [];
      for (const list of parsed.lists) {
        if (list && typeof list.name === 'string' && Array.isArray(list.items)) {
          const listItems: VideoEntry[] = [];
          for (const item of list.items) {
            if (item && typeof item.id === 'string' && idRegex.test(item.id)) {
              listItems.push({
                id: item.id,
                addedAt: typeof item.addedAt === 'number' ? item.addedAt : Date.now(),
                title: typeof item.title === 'string' ? item.title.slice(0, 100) : undefined
              });
              // Also add to validItems if not already collected
              if (!validItems.some((v) => v.id === item.id)) {
                validItems.push(listItems[listItems.length - 1]);
              }
            }
          }
          validatedLists.push({
            id: typeof list.id === 'string' ? list.id : `list_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            name: list.name.slice(0, 50).trim() || 'Untitled List',
            items: listItems,
            lastActiveIndex: typeof list.lastActiveIndex === 'number' ? list.lastActiveIndex : 0
          });
        }
      }
    }

    return {
      valid: true,
      items: validItems,
      lists: validatedLists,
      activeListId: typeof parsed.activeListId === 'string' ? parsed.activeListId : undefined
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
