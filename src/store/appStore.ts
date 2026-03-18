import { create } from 'zustand';

export type AppPhase = 'idle' | 'loading' | 'active';

export interface SongInfo {
  title: string;
  artist: string;
}

interface AppStore {
  phase: AppPhase;
  songInfo: SongInfo | null;
  setPhase: (phase: AppPhase) => void;
  setSongInfo: (info: SongInfo) => void;
  reset: () => void;
}

export const useAppStore = create<AppStore>((set) => ({
  phase: 'idle',
  songInfo: null,
  setPhase: (phase) => set({ phase }),
  setSongInfo: (songInfo) => set({ songInfo }),
  reset: () => set({ phase: 'idle', songInfo: null }),
}));
