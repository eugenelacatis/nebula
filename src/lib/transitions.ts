import gsap from 'gsap';
import { useSceneStore } from '@/store/sceneStore';
import { useAppStore } from '@/store/appStore';
import type { SceneConfig } from '@/config/sceneConfig';

// GSAP timeline for the "cosmos awakening" transition
// Lerps from current config to new config over ~2.5s
export function transitionToConfig(newConfig: SceneConfig): void {
  const currentConfig = useSceneStore.getState().config;

  // Create a proxy object that GSAP will tween
  const proxy = { ...currentConfig };

  gsap.to(proxy, {
    duration: 2.5,
    ease: 'power2.inOut',
    warpSpeedBase: newConfig.warpSpeedBase,
    starDensity: newConfig.starDensity,
    streakLengthMultiplier: newConfig.streakLengthMultiplier,
    nebulaIntensity: newConfig.nebulaIntensity,
    bloomStrengthBase: newConfig.bloomStrengthBase,
    cameraShakeIntensity: newConfig.cameraShakeIntensity,
    cosmicTension: newConfig.cosmicTension,
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
      useSceneStore.getState().setConfig(newConfig);
      console.log('[transitions] Cosmos awakening complete.');
    },
  });

  // Transition colors immediately (they shift visually)
  useSceneStore.getState().patchConfig({
    primaryColor: newConfig.primaryColor,
    secondaryColor: newConfig.secondaryColor,
    accentColor: newConfig.accentColor,
    mood: newConfig.mood,
  });

  // Set app phase to active
  useAppStore.getState().setPhase('active');

  console.log('[transitions] Cosmos awakening started. Mood:', newConfig.mood);
}
