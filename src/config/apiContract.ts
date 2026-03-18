import type { SceneConfig } from "./sceneConfig";
import { DEFAULT_SCENE_CONFIG } from "./sceneConfig";

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function hexColor(v: unknown, fallback: string): string {
  if (typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v)) return v;
  return fallback;
}

function num(v: unknown, fallback: number, min: number, max: number): number {
  const n = typeof v === "number" ? v : parseFloat(v as string);
  if (isNaN(n)) return fallback;
  return clamp(n, min, max);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function sanitizeSceneConfig(raw: any): SceneConfig {
  const d = DEFAULT_SCENE_CONFIG;
  return {
    primaryColor: hexColor(raw?.primaryColor, d.primaryColor),
    secondaryColor: hexColor(raw?.secondaryColor, d.secondaryColor),
    accentColor: hexColor(raw?.accentColor, d.accentColor),
    backgroundColor: hexColor(raw?.backgroundColor, d.backgroundColor),

    warpSpeedBase: num(raw?.warpSpeedBase, d.warpSpeedBase, 0.5, 3.0),
    cosmicTension: num(raw?.cosmicTension, d.cosmicTension, 0.0, 1.0),
    cameraShakeIntensity: num(raw?.cameraShakeIntensity, d.cameraShakeIntensity, 0.0, 1.0),

    nebulaIntensity: num(raw?.nebulaIntensity, d.nebulaIntensity, 0.0, 1.0),
    bloomStrengthBase: num(raw?.bloomStrengthBase, d.bloomStrengthBase, 0.0, 3.0),

    streakLengthMultiplier: num(raw?.streakLengthMultiplier, d.streakLengthMultiplier, 0.5, 3.0),

    mood: typeof raw?.mood === "string" ? raw.mood : d.mood,
  };
}
