import { create } from 'zustand';

export type AppPhase = 'idle' | 'loading' | 'active';

export interface SongMetadata {
  title: string;
  artist: string;
}

interface AppState {
  phase: AppPhase;
  metadata: SongMetadata | null;
  audioUrl: string | null;
  setPhase: (phase: AppPhase) => void;
  setMetadata: (metadata: SongMetadata) => void;
  setAudioUrl: (url: string) => void;
  reset: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  phase: 'idle',
  metadata: null,
  audioUrl: null,
  setPhase: (phase) => set({ phase }),
  setMetadata: (metadata) => set({ metadata }),
  setAudioUrl: (url) => set({ audioUrl: url }),
  reset: () => set({ phase: 'idle', metadata: null, audioUrl: null }),
}));
