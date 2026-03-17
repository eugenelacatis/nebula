import { create } from 'zustand';
import { SceneConfig, DEFAULT_SCENE_CONFIG } from '@/config/sceneConfig';

interface SceneState {
  config: SceneConfig;
  setConfig: (config: SceneConfig) => void;
  patchConfig: (partial: Partial<SceneConfig>) => void;
}

export const useSceneStore = create<SceneState>((set, get) => ({
  config: { ...DEFAULT_SCENE_CONFIG },
  setConfig: (config) => set({ config }),
  patchConfig: (partial) => set({ config: { ...get().config, ...partial } }),
}));
