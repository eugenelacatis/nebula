export const FFT_SIZE = 2048;
export const SMOOTHING_TIME_CONSTANT = 0.8;

// Frequency band ranges in Hz
export const BASS_MIN = 20;
export const BASS_MAX = 250;
export const MIDS_MIN = 250;
export const MIDS_MAX = 4000;
export const HIGHS_MIN = 4000;
export const HIGHS_MAX = 16000;

// Audio feature smoothing (per-frame lerp factor)
export const FEATURE_SMOOTHING = 0.25;

// Beat detection
export const BEAT_THRESHOLD = 0.45;
export const BEAT_COOLDOWN_MS = 180;
