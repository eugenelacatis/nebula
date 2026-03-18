import { FFT_SIZE, SMOOTHING_TIME_CONSTANT } from "./constants";
import { FeatureExtractor } from "./FeatureExtractor";
import { useAudioStore } from "@/store/audioStore";
import { usePlayerStore } from "@/store/playerStore";

export class AudioPipeline {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private extractor = new FeatureExtractor();
  private rafId: number | null = null;
  private dataArray: Uint8Array = new Uint8Array(FFT_SIZE / 2);
  private floatData: Float32Array = new Float32Array(FFT_SIZE / 2);
  private audioEl: HTMLAudioElement | null = null;

  init(audioEl: HTMLAudioElement) {
    this.audioEl = audioEl;
    this.ctx = new AudioContext();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = FFT_SIZE;
    this.analyser.smoothingTimeConstant = SMOOTHING_TIME_CONSTANT;
    this.source = this.ctx.createMediaElementSource(audioEl);
    this.source.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    audioEl.addEventListener("timeupdate", this.onTimeUpdate);
    audioEl.addEventListener("loadedmetadata", this.onMetadata);
    audioEl.addEventListener("play", () => usePlayerStore.getState().setIsPlaying(true));
    audioEl.addEventListener("pause", () => usePlayerStore.getState().setIsPlaying(false));
  }

  private onTimeUpdate = () => {
    if (this.audioEl) {
      usePlayerStore.getState().setCurrentTime(this.audioEl.currentTime);
    }
  };

  private onMetadata = () => {
    if (this.audioEl) {
      usePlayerStore.getState().setDuration(this.audioEl.duration);
    }
  };

  start() {
    if (this.ctx?.state === "suspended") this.ctx.resume();
    this.loop();
  }

  private loop = () => {
    if (!this.analyser) return;
    this.rafId = requestAnimationFrame(this.loop);

    this.analyser.getByteFrequencyData(this.dataArray);
    this.analyser.getFloatFrequencyData(this.floatData);

    const now = performance.now();
    const features = this.extractor.extract(this.dataArray, now);

    // Normalize floatData (dB) to 0-1 for waveform
    const normalized = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      normalized[i] = Math.max(0, (this.floatData[i] + 100) / 100);
    }

    useAudioStore.getState().setFeatures({ ...features, frequencyData: normalized });
  };

  stop() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.ctx?.state === "running") this.ctx.suspend();
  }

  dispose() {
    this.stop();
    this.source?.disconnect();
    this.analyser?.disconnect();
    this.ctx?.close();
    this.ctx = null;
    this.source = null;
    this.analyser = null;
  }
}
