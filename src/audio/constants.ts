export const FFT_SIZE = 2048;

export const FREQ_RANGES = {
  bass: { min: 20, max: 250 },
  mids: { min: 250, max: 4000 },
  highs: { min: 4000, max: 16000 },
} as const;

export const SMOOTHING = {
  bass: 0.15,
  mids: 0.12,
  highs: 0.1,
  energy: 0.1,
} as const;

export const BEAT_CONFIG = {
  threshold: 1.65,
  cooldownMs: 200,
  bassThreshold: 0.5,
  historyLength: 43, // ~1 second at 60fps / 1.4 average
} as const;

export const SAMPLE_RATE = 44100;
