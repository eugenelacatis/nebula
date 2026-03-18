import { create } from 'zustand';

export interface ControlsState {
  // Visibility toggles
  particlesEnabled: boolean;
  nebulaEnabled: boolean;
  sphereEnabled: boolean;

  // Particles
  particleSpeed: number;      // 0.1 – 3.0  (multiplier on warpSpeedBase)
  particleSize: number;       // 0.3 – 3.0  (multiplier on base size)

  // Bloom
  bloomStrength: number;      // 0.0 – 2.5

  // Camera
  cameraShake: number;        // 0.0 – 1.5
  cameraSway: number;         // 0.0 – 2.0

  // Audio reactivity
  reactivityGain: number;     // 0.2 – 2.5  (global scale on all audio values)

  // Sphere
  sphereScale: number;        // 0.3 – 2.0
  sphereReactivity: number;   // 0.1 – 3.0
  sphereWireframe: boolean;

  // Setters
  set: (patch: Partial<Omit<ControlsState, 'set'>>) => void;
}

export const useControlsStore = create<ControlsState>((set) => ({
  particlesEnabled: true,
  nebulaEnabled: true,
  sphereEnabled: true,

  particleSpeed: 1.0,
  particleSize: 1.0,

  bloomStrength: 1.0,

  cameraShake: 1.0,
  cameraSway: 1.0,

  reactivityGain: 1.0,

  sphereScale: 1.0,
  sphereReactivity: 1.0,
  sphereWireframe: true,

  set: (patch) => set((s) => ({ ...s, ...patch })),
}));
