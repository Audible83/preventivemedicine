import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { GuidelineSchema, type Guideline } from '@pm-valet/shared';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const GUIDELINES_DIR = join(__dirname, '..', '..', '..', '..', 'data', 'guidelines');

let guidelinesCache: Guideline[] | null = null;

export async function loadGuidelines(): Promise<Guideline[]> {
  if (guidelinesCache) return guidelinesCache;

  try {
    const files = await readdir(GUIDELINES_DIR);
    const jsonFiles = files.filter((f) => f.endsWith('.json'));

    const guidelines: Guideline[] = [];
    for (const file of jsonFiles) {
      const content = await readFile(join(GUIDELINES_DIR, file), 'utf-8');
      const parsed = JSON.parse(content);
      const result = GuidelineSchema.safeParse(parsed);
      if (result.success) {
        guidelines.push(result.data);
      } else {
        console.warn(`Invalid guideline file ${file}:`, result.error.flatten());
      }
    }

    guidelinesCache = guidelines;
    return guidelines;
  } catch (err) {
    console.warn('Failed to load guidelines directory:', err);
    return [];
  }
}

export function clearGuidelinesCache() {
  guidelinesCache = null;
}
