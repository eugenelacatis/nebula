import { create } from "zustand";

interface ControlsStore {
  dragDelta: { x: number; y: number };
  isDragging: boolean;
  setDragDelta: (d: { x: number; y: number }) => void;
  setIsDragging: (v: boolean) => void;
}

export const useControlsStore = create<ControlsStore>((set) => ({
  dragDelta: { x: 0, y: 0 },
  isDragging: false,
  setDragDelta: (dragDelta) => set({ dragDelta }),
  setIsDragging: (isDragging) => set({ isDragging }),
}));
