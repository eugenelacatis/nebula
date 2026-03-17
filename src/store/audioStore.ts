import { create } from 'zustand';

export interface AudioFeatures {
  bass: number;
  mids: number;
  highs: number;
  energy: number;
  beat: boolean;
}

interface AudioState {
  features: AudioFeatures;
  setFeatures: (features: AudioFeatures) => void;
}

export const useAudioStore = create<AudioState>((set) => ({
  features: {
    bass: 0,
    mids: 0,
    highs: 0,
    energy: 0,
    beat: false,
  },
  setFeatures: (features) => set({ features }),
}));
