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

function clamp(value: number, min: number = 0, max: number = 1): number {
  return Math.min(Math.max(value, min), max);
}

function remapWithFloor(value: number, floor: number, ceiling: number): number {
  if (ceiling <= floor + 0.0001) {
    return 0;
  }

  const normalized = (value - floor) / (ceiling - floor);
  return clamp(normalized);
}

export class FeatureExtractor {
  private smoothedBass = 0;
  private smoothedMids = 0;
  private smoothedHighs = 0;
  private smoothedEnergy = 0;
  private lastBeatTime = 0;
  private bassFloor = 0.02;
  private midsFloor = 0.02;
  private highsFloor = 0.015;
  private energyFloor = 0.02;
  private bassCeiling = 0.35;
  private midsCeiling = 0.35;
  private highsCeiling = 0.3;
  private energyCeiling = 0.3;

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

    this.updateAdaptiveRanges(rawBass, rawMids, rawHighs, rawEnergy);

    const normalizedBass = remapWithFloor(rawBass, this.bassFloor, this.bassCeiling);
    const normalizedMids = remapWithFloor(rawMids, this.midsFloor, this.midsCeiling);
    const normalizedHighs = remapWithFloor(rawHighs, this.highsFloor, this.highsCeiling);
    const normalizedEnergy = remapWithFloor(rawEnergy, this.energyFloor, this.energyCeiling);

    this.smoothedBass = lerp(this.smoothedBass, normalizedBass, FEATURE_SMOOTHING * 0.9);
    this.smoothedMids = lerp(this.smoothedMids, normalizedMids, FEATURE_SMOOTHING * 0.9);
    this.smoothedHighs = lerp(this.smoothedHighs, normalizedHighs, FEATURE_SMOOTHING * 0.9);
    this.smoothedEnergy = lerp(this.smoothedEnergy, normalizedEnergy, FEATURE_SMOOTHING * 0.8);

    const now = performance.now();
    const beat =
      normalizedBass > BEAT_THRESHOLD &&
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

  private updateAdaptiveRanges(
    bass: number,
    mids: number,
    highs: number,
    energy: number
  ): void {
    this.bassFloor = lerp(this.bassFloor, bass * 0.85, 0.02);
    this.midsFloor = lerp(this.midsFloor, mids * 0.85, 0.02);
    this.highsFloor = lerp(this.highsFloor, highs * 0.82, 0.02);
    this.energyFloor = lerp(this.energyFloor, energy * 0.88, 0.02);

    this.bassCeiling = Math.max(this.bassFloor + 0.12, lerp(this.bassCeiling, bass, 0.015));
    this.midsCeiling = Math.max(this.midsFloor + 0.12, lerp(this.midsCeiling, mids, 0.015));
    this.highsCeiling = Math.max(this.highsFloor + 0.1, lerp(this.highsCeiling, highs, 0.015));
    this.energyCeiling = Math.max(this.energyFloor + 0.1, lerp(this.energyCeiling, energy, 0.015));

    this.bassCeiling *= 0.999;
    this.midsCeiling *= 0.999;
    this.highsCeiling *= 0.999;
    this.energyCeiling *= 0.999;
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
