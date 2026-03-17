import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { DEFAULT_SCENE_CONFIG, clampConfig } from '@/config/sceneConfig';
import type { SceneSeedRequest, SceneSeedResponse } from '@/config/apiContract';

const SYSTEM_PROMPT = `You generate scene configurations for an audio-reactive space visualization. Given a song title and artist, return a JSON object that captures the cultural and emotional identity of the song as visual parameters for a deep-space scene. Consider genre, mood, era, cultural context. Return ONLY valid JSON, no markdown, no explanation.

The JSON must have exactly these fields:
- primaryColor: string (#RRGGBB) — dominant nebula/ambient color
- secondaryColor: string (#RRGGBB) — accent for star highlights
- accentColor: string (#RRGGBB) — beat flash and particle burst color
- warpSpeedBase: number (0.3–3.0) — base camera speed
- starDensity: number (0.3–1.0) — star count multiplier
- streakLengthMultiplier: number (0.5–2.0) — streak line length
- nebulaIntensity: number (0.0–1.0) — nebula opacity
- bloomStrengthBase: number (0.3–1.5) — base bloom glow
- cameraShakeIntensity: number (0.0–1.0) — bass camera shake
- cosmicTension: number (0.0–1.0) — particle spread and contrast
- mood: string (one of: serene, melancholic, euphoric, aggressive, mysterious, triumphant, chaotic, ethereal)`;

export async function POST(request: NextRequest): Promise<NextResponse<SceneSeedResponse>> {
  const body: SceneSeedRequest = await request.json().catch(() => ({ title: '', artist: '' }));
  console.log('[scene-seed] Request:', body.title, '-', body.artist);

  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[scene-seed] No ANTHROPIC_API_KEY, returning defaults.');
    return NextResponse.json({ config: DEFAULT_SCENE_CONFIG, fromAI: false });
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Song: ${body.title || 'Unknown'} | Artist: ${body.artist || 'Unknown'}`,
        },
      ],
    });

    const rawText = message.content[0].type === 'text' ? message.content[0].text.trim() : '';
    const parsed = JSON.parse(rawText);
    const config = clampConfig({ ...DEFAULT_SCENE_CONFIG, ...parsed });

    console.log('[scene-seed] AI config applied. Mood:', config.mood);
    return NextResponse.json({ config, fromAI: true });
  } catch (error) {
    console.error('[scene-seed] Claude call failed, using defaults:', error);
    return NextResponse.json({ config: DEFAULT_SCENE_CONFIG, fromAI: false });
  }
}
