import gsap from 'gsap';
import { useSceneStore } from '@/store/sceneStore';
import { useAppStore } from '@/store/appStore';
import type { SceneConfig } from '@/config/sceneConfig';

interface TransitionOptions {
  preserveTunedValues?: boolean;
}

// GSAP timeline for the "cosmos awakening" transition
// Lerps from current config to new config over ~2.5s
export function transitionToConfig(
  newConfig: SceneConfig,
  options: TransitionOptions = {}
): void {
  const currentConfig = useSceneStore.getState().config;
  const preserveTunedValues = options.preserveTunedValues ?? false;
  const targetConfig = preserveTunedValues
    ? {
        ...currentConfig,
        primaryColor: newConfig.primaryColor,
        secondaryColor: newConfig.secondaryColor,
        accentColor: newConfig.accentColor,
        mood: newConfig.mood,
      }
    : newConfig;

  // Create a proxy object that GSAP will tween
  const proxy = { ...currentConfig };

  gsap.to(proxy, {
    duration: 2.5,
    ease: 'power2.inOut',
    warpSpeedBase: targetConfig.warpSpeedBase,
    starDensity: targetConfig.starDensity,
    streakLengthMultiplier: targetConfig.streakLengthMultiplier,
    nebulaIntensity: targetConfig.nebulaIntensity,
    bloomStrengthBase: targetConfig.bloomStrengthBase,
    cameraShakeIntensity: targetConfig.cameraShakeIntensity,
    cosmicTension: targetConfig.cosmicTension,
    onUpdate: () => {
      useSceneStore.getState().patchConfig({
        warpSpeedBase: proxy.warpSpeedBase,
        starDensity: proxy.starDensity,
        streakLengthMultiplier: proxy.streakLengthMultiplier,
        nebulaIntensity: proxy.nebulaIntensity,
        bloomStrengthBase: proxy.bloomStrengthBase,
        cameraShakeIntensity: proxy.cameraShakeIntensity,
        cosmicTension: proxy.cosmicTension,
      });
    },
    onComplete: () => {
      // Apply colors and mood at the end (not lerp-able)
      useSceneStore.getState().setConfig(targetConfig);
      console.log('[transitions] Cosmos awakening complete.');
    },
  });

  // Transition colors immediately (they shift visually)
  useSceneStore.getState().patchConfig({
    primaryColor: targetConfig.primaryColor,
    secondaryColor: targetConfig.secondaryColor,
    accentColor: targetConfig.accentColor,
    mood: targetConfig.mood,
  });

  // Set app phase to active
  useAppStore.getState().setPhase('active');

  console.log('[transitions] Cosmos awakening started. Mood:', targetConfig.mood);
}
