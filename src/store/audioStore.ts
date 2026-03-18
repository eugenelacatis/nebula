import { create } from "zustand";

export interface AudioFeatures {
  bass: number;
  energy: number;
  beat: boolean;
  smoothedBass: number;
  smoothedEnergy: number;
  frequencyData: Float32Array;
}

interface AudioStore {
  features: AudioFeatures;
  setFeatures: (f: Partial<AudioFeatures>) => void;
}

export const DEFAULT_AUDIO_FEATURES: AudioFeatures = {
  bass: 0,
  energy: 0,
  beat: false,
  smoothedBass: 0,
  smoothedEnergy: 0,
  frequencyData: new Float32Array(256),
};

export const useAudioStore = create<AudioStore>((set) => ({
  features: DEFAULT_AUDIO_FEATURES,
  setFeatures: (f) =>
    set((s) => ({ features: { ...s.features, ...f } })),
}));
