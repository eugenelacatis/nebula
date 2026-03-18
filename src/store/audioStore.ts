import { create } from 'zustand';

export interface AudioFeatures {
  bass: number;
  mids: number;
  highs: number;
  energy: number;
  beat: boolean;
  smoothedBass: number;
  smoothedMids: number;
  smoothedHighs: number;
  smoothedEnergy: number;
  frequencyData: Uint8Array;
}

interface AudioStore extends AudioFeatures {
  setFeatures: (features: Partial<AudioFeatures>) => void;
  reset: () => void;
}

const defaultFeatures: AudioFeatures = {
  bass: 0,
  mids: 0,
  highs: 0,
  energy: 0,
  beat: false,
  smoothedBass: 0,
  smoothedMids: 0,
  smoothedHighs: 0,
  smoothedEnergy: 0,
  frequencyData: new Uint8Array(1024),
};

export const useAudioStore = create<AudioStore>((set) => ({
  ...defaultFeatures,
  setFeatures: (features) => set((state) => ({ ...state, ...features })),
  reset: () => set({ ...defaultFeatures, frequencyData: new Uint8Array(1024) }),
}));
