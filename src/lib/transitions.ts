import { gsap } from 'gsap';
import { SceneConfig, DEFAULT_SCENE_CONFIG, IDLE_SCENE_CONFIG } from '@/config/sceneConfig';

// liveConfig is the single source of truth for Three.js each frame
// GSAP tweens fields directly on this object
// Start in idle (slow drift) so the scene looks calm before music loads
export const liveConfig: SceneConfig = { ...IDLE_SCENE_CONFIG };

export function applyConfigImmediate(config: SceneConfig) {
  Object.assign(liveConfig, config);
}

export function transitionToConfig(target: SceneConfig, duration = 2.5) {
  const numericKeys: (keyof SceneConfig)[] = [
    'warpSpeedBase',
    'starDensity',
    'streakLengthMultiplier',
    'nebulaIntensity',
    'bloomStrengthBase',
    'cameraShakeIntensity',
    'cosmicTension',
  ];

  const colorKeys: (keyof SceneConfig)[] = ['primaryColor', 'secondaryColor', 'accentColor'];

  // Tween numeric fields
  const numericTarget: Partial<SceneConfig> = {};
  for (const key of numericKeys) {
    (numericTarget as Record<string, unknown>)[key] = target[key];
  }
  gsap.to(liveConfig, { ...numericTarget, duration, ease: 'power2.inOut' });

  // Tween color fields
  for (const key of colorKeys) {
    gsap.to(liveConfig, {
      [key]: target[key],
      duration,
      ease: 'power2.inOut',
    });
  }

  // Apply non-tweened fields immediately
  liveConfig.mood = target.mood;
}
