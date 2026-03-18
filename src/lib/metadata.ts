export interface SongMetadata {
  title: string;
  artist: string;
}

export async function extractMetadata(file: File): Promise<SongMetadata> {
  const fallback: SongMetadata = {
    title: file.name.replace(/\.[^/.]+$/, ''),
    artist: 'Unknown Artist',
  };

  try {
    // Dynamic import to avoid SSR issues
    const jsmediatags = await import('jsmediatags');
    return new Promise((resolve) => {
      jsmediatags.default.read(file, {
        onSuccess: (tag: { tags: { title?: string; artist?: string } }) => {
          resolve({
            title: tag.tags.title || fallback.title,
            artist: tag.tags.artist || fallback.artist,
          });
        },
        onError: () => resolve(fallback),
      });
    });
  } catch {
    return fallback;
  }
}
