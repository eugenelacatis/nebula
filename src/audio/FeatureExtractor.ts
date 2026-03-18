import {
  BASS_RANGE,
  MIDS_RANGE,
  HIGHS_RANGE,
  BASS_SMOOTH,
  ENERGY_SMOOTH,
  BEAT_THRESHOLD_MULTIPLIER,
  BEAT_MIN_ENERGY,
  BEAT_COOLDOWN_MS,
  BEAT_HISTORY_FRAMES,
} from "./constants";

function bandEnergy(data: Uint8Array, start: number, end: number): number {
  let sum = 0;
  const count = end - start;
  for (let i = start; i < end; i++) sum += data[i] / 255;
  return sum / count;
}

export class FeatureExtractor {
  private smoothedBass = 0;
  private smoothedEnergy = 0;
  private bassHistory: number[] = [];
  private lastBeatTime = 0;

  extract(
    data: Uint8Array,
    now: number
  ): {
    bass: number;
    energy: number;
    beat: boolean;
    smoothedBass: number;
    smoothedEnergy: number;
  } {
    const bass = bandEnergy(data, BASS_RANGE[0], BASS_RANGE[1]);
    const mids = bandEnergy(data, MIDS_RANGE[0], MIDS_RANGE[1]);
    const highs = bandEnergy(data, HIGHS_RANGE[0], HIGHS_RANGE[1]);
    const energy = (bass + mids + highs) / 3;

    this.smoothedBass = BASS_SMOOTH * this.smoothedBass + (1 - BASS_SMOOTH) * bass;
    this.smoothedEnergy = ENERGY_SMOOTH * this.smoothedEnergy + (1 - ENERGY_SMOOTH) * energy;

    this.bassHistory.push(bass);
    if (this.bassHistory.length > BEAT_HISTORY_FRAMES) this.bassHistory.shift();

    const avg =
      this.bassHistory.reduce((a, b) => a + b, 0) / this.bassHistory.length;

    const beat =
      bass > avg * BEAT_THRESHOLD_MULTIPLIER &&
      bass > BEAT_MIN_ENERGY &&
      now - this.lastBeatTime > BEAT_COOLDOWN_MS;

    if (beat) this.lastBeatTime = now;

    return { bass, energy, beat, smoothedBass: this.smoothedBass, smoothedEnergy: this.smoothedEnergy };
  }
}
