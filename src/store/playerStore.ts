import { create } from "zustand";

interface PlayerStore {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  title: string;
  artist: string;
  setIsPlaying: (v: boolean) => void;
  setCurrentTime: (v: number) => void;
  setDuration: (v: number) => void;
  setTrackInfo: (title: string, artist: string) => void;
}

export const usePlayerStore = create<PlayerStore>((set) => ({
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  title: "Unknown",
  artist: "Unknown",
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setDuration: (duration) => set({ duration }),
  setTrackInfo: (title, artist) => set({ title, artist }),
}));
