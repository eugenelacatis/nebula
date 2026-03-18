import { create } from "zustand";
import type { SceneConfig } from "@/config/sceneConfig";
import { DEFAULT_SCENE_CONFIG } from "@/config/sceneConfig";

interface SceneStore {
  config: SceneConfig;
  isTransitioning: boolean;
  setSceneConfig: (c: SceneConfig) => void;
  setTransitioning: (v: boolean) => void;
}

export const useSceneStore = create<SceneStore>((set) => ({
  config: DEFAULT_SCENE_CONFIG,
  isTransitioning: false,
  setSceneConfig: (config) => set({ config }),
  setTransitioning: (isTransitioning) => set({ isTransitioning }),
}));
