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

// Neutral deep-space blue — no pink. Colors come from AI when available.
export const DEFAULT_SCENE_CONFIG: SceneConfig = {
  primaryColor: '#050c1a',
  secondaryColor: '#0f2744',
  accentColor: '#38bdf8',
  warpSpeedBase: 1.0,
  starDensity: 0.7,
  streakLengthMultiplier: 1.0,
  nebulaIntensity: 0.5,
  bloomStrengthBase: 0.8,
  cameraShakeIntensity: 0.3,
  cosmicTension: 0.4,
  mood: 'mysterious',
};

// Idle: pure white/monochrome — particles are white, black void
export const IDLE_SCENE_CONFIG: SceneConfig = {
  primaryColor: '#ffffff',
  secondaryColor: '#cccccc',
  accentColor: '#ffffff',
  warpSpeedBase: 0.45,
  starDensity: 0.5,
  streakLengthMultiplier: 0.4,
  nebulaIntensity: 0.0,
  bloomStrengthBase: 0.4,
  cameraShakeIntensity: 0.0,
  cosmicTension: 0.0,
  mood: 'serene',
};
