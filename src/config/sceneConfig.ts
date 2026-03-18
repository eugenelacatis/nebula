export type Mood =
  | 'serene'
  | 'melancholic'
  | 'euphoric'
  | 'aggressive'
  | 'mysterious'
  | 'triumphant'
  | 'chaotic'
  | 'ethereal';

export interface SceneConfig {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  warpSpeedBase: number;
  starDensity: number;
  streakLengthMultiplier: number;
  nebulaIntensity: number;
  bloomStrengthBase: number;
  cameraShakeIntensity: number;
  cosmicTension: number;
  mood: Mood;
}

export const DEFAULT_SCENE_CONFIG: SceneConfig = {
  primaryColor: '#1a1a3e',
  secondaryColor: '#2d2d6b',
  accentColor: '#4a4aff',
  warpSpeedBase: 0.8,
  starDensity: 0.5,
  streakLengthMultiplier: 1.0,
  nebulaIntensity: 0.3,
  bloomStrengthBase: 0.6,
  cameraShakeIntensity: 0.2,
  cosmicTension: 0.3,
  mood: 'serene',
};

export function clampConfig(config: SceneConfig): SceneConfig {
  return {
    ...config,
    warpSpeedBase: clamp(config.warpSpeedBase, 0.3, 3.0),
    starDensity: clamp(config.starDensity, 0.1, 1.0),
    streakLengthMultiplier: clamp(config.streakLengthMultiplier, 0.2, 2.0),
    nebulaIntensity: clamp(config.nebulaIntensity, 0.0, 1.0),
    bloomStrengthBase: clamp(config.bloomStrengthBase, 0.0, 1.5),
    cameraShakeIntensity: clamp(config.cameraShakeIntensity, 0.0, 1.0),
    cosmicTension: clamp(config.cosmicTension, 0.0, 1.0),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
