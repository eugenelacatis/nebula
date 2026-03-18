export interface SceneConfig {
  // Colors (hex strings)
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;

  // Speed & motion
  warpSpeedBase: number;       // 0.5 – 3.0
  cosmicTension: number;       // 0.0 – 1.0  (camera drift intensity)
  cameraShakeIntensity: number; // 0.0 – 1.0

  // Density & bloom
  nebulaIntensity: number;     // 0.0 – 1.0
  bloomStrengthBase: number;   // 0.0 – 3.0

  // Streak
  streakLengthMultiplier: number; // 0.5 – 3.0

  // Mood label (purely informational)
  mood: string;
}

export const DEFAULT_SCENE_CONFIG: SceneConfig = {
  primaryColor: "#4488ff",
  secondaryColor: "#aa44ff",
  accentColor: "#ff8844",
  backgroundColor: "#000005",

  warpSpeedBase: 1.0,
  cosmicTension: 0.3,
  cameraShakeIntensity: 0.4,

  nebulaIntensity: 0.6,
  bloomStrengthBase: 1.2,

  streakLengthMultiplier: 1.0,

  mood: "serene",
};
