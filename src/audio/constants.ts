export const FFT_SIZE = 2048;
export const SMOOTHING_TIME_CONSTANT = 0.8;

// Frequency bin ranges (out of FFT_SIZE/2 = 1024 bins at 44100Hz sample rate)
export const BASS_RANGE = [0, 10] as const;
export const MIDS_RANGE = [10, 100] as const;
export const HIGHS_RANGE = [100, 512] as const;

// Smoothing alphas (0 = no smoothing, 1 = frozen)
export const BASS_SMOOTH = 0.85;
export const ENERGY_SMOOTH = 0.9;

// Beat detection
export const BEAT_THRESHOLD_MULTIPLIER = 1.5;
export const BEAT_MIN_ENERGY = 0.4;
export const BEAT_COOLDOWN_MS = 200;
export const BEAT_HISTORY_FRAMES = 60;
