import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { SceneConfig } from '@/config/sceneConfig';
import { DEFAULT_SCENE_CONFIG } from '@/config/sceneConfig';
import type { SceneSeedRequest } from '@/config/apiContract';

const client = new Anthropic();

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function sanitizeConfig(raw: Record<string, unknown>): SceneConfig {
  const moods = ['serene','melancholic','euphoric','aggressive','mysterious','triumphant','chaotic','ethereal'] as const;
  const isValidMood = (m: unknown): m is SceneConfig['mood'] =>
    typeof m === 'string' && (moods as readonly string[]).includes(m);
  const isHex = (s: unknown): s is string =>
    typeof s === 'string' && /^#[0-9a-fA-F]{6}$/.test(s);

  return {
    primaryColor: isHex(raw.primaryColor) ? raw.primaryColor : DEFAULT_SCENE_CONFIG.primaryColor,
    secondaryColor: isHex(raw.secondaryColor) ? raw.secondaryColor : DEFAULT_SCENE_CONFIG.secondaryColor,
    accentColor: isHex(raw.accentColor) ? raw.accentColor : DEFAULT_SCENE_CONFIG.accentColor,
    warpSpeedBase: clamp(typeof raw.warpSpeedBase === 'number' ? raw.warpSpeedBase : DEFAULT_SCENE_CONFIG.warpSpeedBase, 0.3, 3.0),
    starDensity: clamp(typeof raw.starDensity === 'number' ? raw.starDensity : DEFAULT_SCENE_CONFIG.starDensity, 0.3, 1.0),
    streakLengthMultiplier: clamp(typeof raw.streakLengthMultiplier === 'number' ? raw.streakLengthMultiplier : DEFAULT_SCENE_CONFIG.streakLengthMultiplier, 0.5, 2.0),
    nebulaIntensity: clamp(typeof raw.nebulaIntensity === 'number' ? raw.nebulaIntensity : DEFAULT_SCENE_CONFIG.nebulaIntensity, 0.0, 1.0),
    bloomStrengthBase: clamp(typeof raw.bloomStrengthBase === 'number' ? raw.bloomStrengthBase : DEFAULT_SCENE_CONFIG.bloomStrengthBase, 0.3, 1.5),
    cameraShakeIntensity: clamp(typeof raw.cameraShakeIntensity === 'number' ? raw.cameraShakeIntensity : DEFAULT_SCENE_CONFIG.cameraShakeIntensity, 0.0, 1.0),
    cosmicTension: clamp(typeof raw.cosmicTension === 'number' ? raw.cosmicTension : DEFAULT_SCENE_CONFIG.cosmicTension, 0.0, 1.0),
    mood: isValidMood(raw.mood) ? raw.mood : DEFAULT_SCENE_CONFIG.mood,
  };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = (await req.json()) as SceneSeedRequest;
    const { title, artist } = body;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: `You are a creative AI that generates visual scene configurations for an audio-reactive space travel visualizer. Given a song title and artist, return ONLY a raw JSON object (no markdown, no explanation) matching this schema:
{
  "primaryColor": "#RRGGBB",
  "secondaryColor": "#RRGGBB",
  "accentColor": "#RRGGBB",
  "warpSpeedBase": 0.3-3.0,
  "starDensity": 0.3-1.0,
  "streakLengthMultiplier": 0.5-2.0,
  "nebulaIntensity": 0.0-1.0,
  "bloomStrengthBase": 0.3-1.5,
  "cameraShakeIntensity": 0.0-1.0,
  "cosmicTension": 0.0-1.0,
  "mood": "serene|melancholic|euphoric|aggressive|mysterious|triumphant|chaotic|ethereal"
}
Make the colors and parameters reflect the emotional tone and energy of the song.`,
      messages: [
        {
          role: 'user',
          content: `Song: "${title}" by ${artist}`,
        },
      ],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const raw = JSON.parse(text) as Record<string, unknown>;
    const config = sanitizeConfig(raw);

    return NextResponse.json(config);
  } catch (err) {
    console.error('scene-seed error:', err);
    return NextResponse.json(DEFAULT_SCENE_CONFIG);
  }
}
