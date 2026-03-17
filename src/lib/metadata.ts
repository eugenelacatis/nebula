import type { SongMetadata } from '@/store/appStore';

export async function extractMetadata(file: File): Promise<SongMetadata> {
  try {
    const tags = await readID3Tags(file);
    if (tags.title) {
      return {
        title: tags.title,
        artist: tags.artist || 'Unknown Artist',
      };
    }
  } catch {
    // Fall through to filename parsing
  }
  return parseFilename(file.name);
}

function readID3Tags(file: File): Promise<{ title?: string; artist?: string }> {
  return new Promise((resolve, reject) => {
    import('jsmediatags').then(({ default: jsmediatags }) => {
      jsmediatags.read(file, {
        onSuccess(tag: { tags: { title?: string; artist?: string } }) {
          resolve({
            title: tag.tags.title || undefined,
            artist: tag.tags.artist || undefined,
          });
        },
        onError(error: unknown) {
          reject(error);
        },
      });
    }).catch(reject);
  });
}

function parseFilename(filename: string): SongMetadata {
  const base = filename.replace(/\.[^/.]+$/, '');
  const parts = base.split(' - ');
  if (parts.length >= 2) {
    return { title: parts[1].trim(), artist: parts[0].trim() };
  }
  return { title: base, artist: 'Unknown Artist' };
}
