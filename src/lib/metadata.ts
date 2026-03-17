import type { SongMetadata } from '@/store/appStore';

// Simple filename-based metadata extraction for Phase 1
// Phase 3 can add proper ID3 tag reading with a web-compatible library
export async function extractMetadata(file: File): Promise<SongMetadata> {
  const filename = stripExtension(file.name);
  
  // Try to parse "Artist - Title" format, otherwise use full filename as title
  const parts = filename.split(' - ');
  if (parts.length === 2) {
    return {
      title: parts[1].trim(),
      artist: parts[0].trim(),
    };
  }
  
  return {
    title: filename,
    artist: 'Unknown Artist',
  };
}

function stripExtension(filename: string): string {
  return filename.replace(/\.[^/.]+$/, '');
}
