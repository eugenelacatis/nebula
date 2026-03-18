import { FREQ_RANGES, SMOOTHING, BEAT_CONFIG, SAMPLE_RATE } from './constants';

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function freqToIndex(freq: number, sampleRate: number, fftSize: number): number {
  return Math.round((freq / (sampleRate / 2)) * (fftSize / 2));
}

function bandEnergy(data: Uint8Array, minFreq: number, maxFreq: number, sampleRate: number, fftSize: number): number {
  const minIdx = freqToIndex(minFreq, sampleRate, fftSize);
  const maxIdx = Math.min(freqToIndex(maxFreq, sampleRate, fftSize), data.length - 1);
  if (maxIdx <= minIdx) return 0;
  let sum = 0;
  for (let i = minIdx; i <= maxIdx; i++) {
    sum += data[i];
  }
  return sum / ((maxIdx - minIdx + 1) * 255);
}

export class FeatureExtractor {
  private smoothedBass = 0;
  private smoothedMids = 0;
  private smoothedHighs = 0;
  private smoothedEnergy = 0;
  private energyHistory: number[] = [];
  private lastBeatTime = 0;

  extract(data: Uint8Array, sampleRate: number = SAMPLE_RATE): {
    bass: number;
    mids: number;
    highs: number;
    energy: number;
    beat: boolean;
    smoothedBass: number;
    smoothedMids: number;
    smoothedHighs: number;
    smoothedEnergy: number;
  } {
    const fftSize = data.length * 2;

    const rawBass = bandEnergy(data, FREQ_RANGES.bass.min, FREQ_RANGES.bass.max, sampleRate, fftSize);
    const rawMids = bandEnergy(data, FREQ_RANGES.mids.min, FREQ_RANGES.mids.max, sampleRate, fftSize);
    const rawHighs = bandEnergy(data, FREQ_RANGES.highs.min, FREQ_RANGES.highs.max, sampleRate, fftSize);

    // RMS energy
    let sumSquares = 0;
    for (let i = 0; i < data.length; i++) {
      const norm = data[i] / 255;
      sumSquares += norm * norm;
    }
    const rawEnergy = Math.sqrt(sumSquares / data.length);

    // Smooth
    this.smoothedBass = lerp(this.smoothedBass, rawBass, SMOOTHING.bass);
    this.smoothedMids = lerp(this.smoothedMids, rawMids, SMOOTHING.mids);
    this.smoothedHighs = lerp(this.smoothedHighs, rawHighs, SMOOTHING.highs);
    this.smoothedEnergy = lerp(this.smoothedEnergy, rawEnergy, SMOOTHING.energy);

    // Beat detection
    this.energyHistory.push(rawEnergy);
    if (this.energyHistory.length > BEAT_CONFIG.historyLength) {
      this.energyHistory.shift();
    }
    const avgEnergy = this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length;
    const now = performance.now();
    const beat =
      rawEnergy > avgEnergy * BEAT_CONFIG.threshold &&
      rawBass > BEAT_CONFIG.bassThreshold &&
      now - this.lastBeatTime > BEAT_CONFIG.cooldownMs;
    if (beat) this.lastBeatTime = now;

    return {
      bass: rawBass,
      mids: rawMids,
      highs: rawHighs,
      energy: rawEnergy,
      beat,
      smoothedBass: this.smoothedBass,
      smoothedMids: this.smoothedMids,
      smoothedHighs: this.smoothedHighs,
      smoothedEnergy: this.smoothedEnergy,
    };
  }

  reset() {
    this.smoothedBass = 0;
    this.smoothedMids = 0;
    this.smoothedHighs = 0;
    this.smoothedEnergy = 0;
    this.energyHistory = [];
    this.lastBeatTime = 0;
  }
}
