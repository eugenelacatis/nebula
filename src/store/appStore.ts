import { create } from "zustand";

type Phase = "idle" | "loading" | "active";

interface AppStore {
  phase: Phase;
  setPhase: (p: Phase) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  phase: "idle",
  setPhase: (phase) => set({ phase }),
}));
