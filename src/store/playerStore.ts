import { create } from 'zustand';

export interface TrackInfo {
  title: string;
  artist: string;
  src: string;
}

interface PlayerStore {
  samples: TrackInfo[];
  currentTrack: TrackInfo | null;
  playing: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  loop: boolean;

  setSamples: (s: TrackInfo[]) => void;
  setCurrentTrack: (t: TrackInfo | null) => void;
  setPlaying: (p: boolean) => void;
  setCurrentTime: (t: number) => void;
  setDuration: (d: number) => void;
  setVolume: (v: number) => void;
  setLoop: (l: boolean) => void;
}

export const usePlayerStore = create<PlayerStore>((set) => ({
  samples: [],
  currentTrack: null,
  playing: false,
  currentTime: 0,
  duration: 0,
  volume: 0.8,
  loop: false,

  setSamples: (samples) => set({ samples }),
  setCurrentTrack: (currentTrack) => set({ currentTrack }),
  setPlaying: (playing) => set({ playing }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setDuration: (duration) => set({ duration }),
  setVolume: (volume) => set({ volume }),
  setLoop: (loop) => set({ loop }),
}));
