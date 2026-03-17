import type { SceneConfig } from '@/config/sceneConfig';
import type { Mood } from '@/config/sceneConfig';

function hash(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i);
  }
  return Math.abs(h);
}

function hslToHex(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

const MOODS: Mood[] = ['serene', 'melancholic', 'euphoric', 'aggressive', 'mysterious', 'triumphant', 'chaotic', 'ethereal'];

export function seedConfigFromSong(title: string, artist: string): Partial<SceneConfig> {
  const h = hash(`${title}|${artist}`);
  const hue = h % 360;
  const hue2 = (hue + 120 + (h % 80)) % 360;
  const hue3 = (hue + 240 + (h % 60)) % 360;

  const warpSpeed = 0.6 + (h % 100) / 100 * 1.8;
  const starDensity = 0.4 + (h % 100) / 100 * 0.6;
  const tension = (h % 100) / 100;
  const mood = MOODS[h % MOODS.length];

  return {
    primaryColor: hslToHex(hue, 0.7, 0.15),
    secondaryColor: hslToHex(hue2, 0.6, 0.25),
    accentColor: hslToHex(hue3, 1.0, 0.6),
    warpSpeedBase: warpSpeed,
    starDensity,
    streakLengthMultiplier: 0.8 + tension * 0.8,
    nebulaIntensity: 0.3 + tension * 0.5,
    bloomStrengthBase: 0.5 + tension * 0.7,
    cameraShakeIntensity: 0.2 + tension * 0.5,
    cosmicTension: tension,
    mood,
  };
}
