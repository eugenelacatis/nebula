import { FFT_SIZE, SMOOTHING_TIME_CONSTANT } from './constants';
import { FeatureExtractor } from './FeatureExtractor';
import { useAudioStore } from '@/store/audioStore';

export class AudioPipeline {
  private context: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private frequencyData: Uint8Array<ArrayBuffer> | null = null;
  private featureExtractor: FeatureExtractor;
  private rafId: number | null = null;
  private running = false;

  constructor() {
    this.featureExtractor = new FeatureExtractor();
  }

  async init(audioUrl: string): Promise<HTMLAudioElement> {
    this.context = new AudioContext();
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = FFT_SIZE;
    this.analyser.smoothingTimeConstant = SMOOTHING_TIME_CONSTANT;

    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);

    this.audioElement = new Audio();
    this.audioElement.crossOrigin = 'anonymous';
    this.audioElement.src = audioUrl;

    this.source = this.context.createMediaElementSource(this.audioElement);
    this.source.connect(this.analyser);
    this.analyser.connect(this.context.destination);

    console.log('[AudioPipeline] Initialized. FFT size:', FFT_SIZE);
    console.log('[AudioPipeline] Frequency bin count:', this.analyser.frequencyBinCount);
    console.log('[AudioPipeline] Sample rate:', this.context.sampleRate);

    return this.audioElement;
  }

  start(): void {
    if (this.running) return;
    this.running = true;

    if (this.context?.state === 'suspended') {
      this.context.resume();
    }

    this.audioElement?.play();
    this.poll();
    console.log('[AudioPipeline] Started polling.');
  }

  stop(): void {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.audioElement?.pause();
    console.log('[AudioPipeline] Stopped.');
  }

  dispose(): void {
    this.stop();
    this.source?.disconnect();
    this.analyser?.disconnect();
    this.context?.close();
    if (this.audioElement) {
      this.audioElement.src = '';
    }
    this.context = null;
    this.analyser = null;
    this.source = null;
    this.audioElement = null;
    this.frequencyData = null;
    console.log('[AudioPipeline] Disposed.');
  }

  private poll = (): void => {
    if (!this.running || !this.analyser || !this.frequencyData || !this.context) return;

    this.analyser.getByteFrequencyData(this.frequencyData);

    const features = this.featureExtractor.extract(
      this.frequencyData,
      this.context.sampleRate,
      this.analyser.fftSize
    );

    useAudioStore.getState().setFeatures(features);

    console.log(
      '[AudioPipeline] bass:', features.bass.toFixed(2),
      'mids:', features.mids.toFixed(2),
      'highs:', features.highs.toFixed(2),
      'energy:', features.energy.toFixed(2),
      'beat:', features.beat
    );

    this.rafId = requestAnimationFrame(this.poll);
  };
}
