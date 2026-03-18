import { gsap } from "gsap";
import { useSceneStore } from "@/store/sceneStore";
import type { SceneConfig } from "@/config/sceneConfig";

export function transitionSceneConfig(newConfig: SceneConfig, duration = 2) {
  const store = useSceneStore.getState();
  const current = store.config;
  store.setTransitioning(true);

  // Animate numeric fields
  const proxy = {
    warpSpeedBase: current.warpSpeedBase,
    cosmicTension: current.cosmicTension,
    cameraShakeIntensity: current.cameraShakeIntensity,
    nebulaIntensity: current.nebulaIntensity,
    bloomStrengthBase: current.bloomStrengthBase,
    streakLengthMultiplier: current.streakLengthMultiplier,
  };

  gsap.to(proxy, {
    duration,
    ease: "power2.inOut",
    warpSpeedBase: newConfig.warpSpeedBase,
    cosmicTension: newConfig.cosmicTension,
    cameraShakeIntensity: newConfig.cameraShakeIntensity,
    nebulaIntensity: newConfig.nebulaIntensity,
    bloomStrengthBase: newConfig.bloomStrengthBase,
    streakLengthMultiplier: newConfig.streakLengthMultiplier,
    onUpdate: () => {
      store.setSceneConfig({
        ...newConfig,
        ...proxy,
      });
    },
    onComplete: () => {
      store.setSceneConfig(newConfig);
      store.setTransitioning(false);
    },
  });
}
