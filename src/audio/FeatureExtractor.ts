import {
  BASS_MIN,
  BASS_MAX,
  MIDS_MIN,
  MIDS_MAX,
  HIGHS_MIN,
  HIGHS_MAX,
  FEATURE_SMOOTHING,
  BEAT_THRESHOLD,
  BEAT_COOLDOWN_MS,
} from './constants';
import { AudioFeatures } from '@/store/audioStore';

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export class FeatureExtractor {
  private smoothedBass = 0;
  private smoothedMids = 0;
  private smoothedHighs = 0;
  private smoothedEnergy = 0;
  private lastBeatTime = 0;

  extract(
    frequencyData: Uint8Array,
    sampleRate: number,
    fftSize: number
  ): AudioFeatures {
    const binCount = frequencyData.length;
    const nyquist = sampleRate / 2;
    const binWidth = nyquist / binCount;

    const rawBass = this.bandEnergy(frequencyData, BASS_MIN, BASS_MAX, binWidth);
    const rawMids = this.bandEnergy(frequencyData, MIDS_MIN, MIDS_MAX, binWidth);
    const rawHighs = this.bandEnergy(frequencyData, HIGHS_MIN, HIGHS_MAX, binWidth);
    const rawEnergy = this.rms(frequencyData);

    this.smoothedBass = lerp(this.smoothedBass, rawBass, FEATURE_SMOOTHING);
    this.smoothedMids = lerp(this.smoothedMids, rawMids, FEATURE_SMOOTHING);
    this.smoothedHighs = lerp(this.smoothedHighs, rawHighs, FEATURE_SMOOTHING);
    this.smoothedEnergy = lerp(this.smoothedEnergy, rawEnergy, FEATURE_SMOOTHING);

    const now = performance.now();
    const beat =
      rawBass > BEAT_THRESHOLD &&
      now - this.lastBeatTime > BEAT_COOLDOWN_MS;

    if (beat) {
      this.lastBeatTime = now;
    }

    return {
      bass: this.smoothedBass,
      mids: this.smoothedMids,
      highs: this.smoothedHighs,
      energy: this.smoothedEnergy,
      beat,
    };
  }

  private bandEnergy(
    data: Uint8Array,
    minHz: number,
    maxHz: number,
    binWidth: number
  ): number {
    const startBin = Math.floor(minHz / binWidth);
    const endBin = Math.min(Math.floor(maxHz / binWidth), data.length - 1);
    let sum = 0;
    let count = 0;

    for (let i = startBin; i <= endBin; i++) {
      sum += data[i] / 255;
      count++;
    }

    return count > 0 ? sum / count : 0;
  }

  private rms(data: Uint8Array): number {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const normalized = data[i] / 255;
      sum += normalized * normalized;
    }
    return Math.sqrt(sum / data.length);
  }
}
