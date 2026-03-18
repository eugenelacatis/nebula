import { create } from 'zustand';
import { SceneConfig, DEFAULT_SCENE_CONFIG } from '@/config/sceneConfig';

interface SceneStore {
  config: SceneConfig;
  setConfig: (config: SceneConfig) => void;
  updateConfig: (partial: Partial<SceneConfig>) => void;
}

export const useSceneStore = create<SceneStore>((set) => ({
  config: DEFAULT_SCENE_CONFIG,
  setConfig: (config) => set({ config }),
  updateConfig: (partial) => set((state) => ({ config: { ...state.config, ...partial } })),
}));
