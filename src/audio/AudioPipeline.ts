import { useAudioStore } from '@/store/audioStore';
import { FeatureExtractor } from './FeatureExtractor';
import { FFT_SIZE } from './constants';

export class AudioPipeline {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private frequencyData: Uint8Array<ArrayBuffer> = new Uint8Array(FFT_SIZE / 2);
  private extractor = new FeatureExtractor();
  private rafId: number | null = null;
  private audioEl: HTMLAudioElement | null = null;

  init(audioEl: HTMLAudioElement) {
    this.dispose();
    this.audioEl = audioEl;

    this.audioContext = new AudioContext();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = FFT_SIZE;
    this.analyser.smoothingTimeConstant = 0.8;
    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>;

    this.source = this.audioContext.createMediaElementSource(audioEl);
    this.source.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);

    this.extractor.reset();
    this.startLoop();
  }

  private startLoop() {
    const loop = () => {
      if (!this.analyser || !this.audioContext) return;
      this.analyser.getByteFrequencyData(this.frequencyData);
      const sampleRate = this.audioContext.sampleRate;
      const features = this.extractor.extract(this.frequencyData, sampleRate);
      useAudioStore.getState().setFeatures({
        ...features,
        frequencyData: this.frequencyData.slice(),
      });
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  dispose() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.source?.disconnect();
    this.analyser?.disconnect();
    this.audioContext?.close();
    this.audioContext = null;
    this.analyser = null;
    this.source = null;
    this.extractor.reset();
    useAudioStore.getState().reset();
  }
}

export const audioPipeline = new AudioPipeline();
