import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export interface SampleTrack {
  title: string;
  artist: string;
  src: string;
}

export async function GET() {
  try {
    const dir = path.join(process.cwd(), 'public', 'audio');
    if (!fs.existsSync(dir)) return NextResponse.json([]);

    const files = fs
      .readdirSync(dir)
      .filter((f) => f.toLowerCase().endsWith('.mp3'));

    const samples: SampleTrack[] = files.map((f) => ({
      title: f
        .replace(/\.mp3$/i, '')
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase()),
      artist: 'Sample',
      src: `/audio/${f}`,
    }));

    return NextResponse.json(samples);
  } catch {
    return NextResponse.json([]);
  }
}
