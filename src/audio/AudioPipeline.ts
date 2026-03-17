import { FFT_SIZE, SMOOTHING_TIME_CONSTANT } from './constants';
import { FeatureExtractor } from './FeatureExtractor';
import { useAudioStore } from '@/store/audioStore';

export class AudioPipeline {
  private context: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private frequencyData: Uint8Array<ArrayBuffer> | null = null;
  private waveformData: Uint8Array<ArrayBuffer> | null = null;
  private featureExtractor: FeatureExtractor;
  private rafId: number | null = null;
  private running = false;
  private paused = false;
  public onEnded: (() => void) | null = null;

  constructor() {
    this.featureExtractor = new FeatureExtractor();
  }

  async init(audioUrl: string): Promise<HTMLAudioElement> {
    this.context = new AudioContext();
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = FFT_SIZE;
    this.analyser.smoothingTimeConstant = SMOOTHING_TIME_CONSTANT;

    this.gainNode = this.context.createGain();
    this.gainNode.gain.value = 1.0;

    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
    this.waveformData = new Uint8Array(this.analyser.frequencyBinCount);

    this.audioElement = new Audio();
    this.audioElement.crossOrigin = 'anonymous';
    this.audioElement.src = audioUrl;
    this.audioElement.addEventListener('ended', () => {
      this.onEnded?.();
    });

    this.source = this.context.createMediaElementSource(this.audioElement);
    this.source.connect(this.gainNode);
    this.gainNode.connect(this.analyser);
    this.analyser.connect(this.context.destination);

    return this.audioElement;
  }

  setVolume(value: number): void {
    if (this.gainNode) this.gainNode.gain.value = Math.max(0, Math.min(1, value));
  }

  togglePause(): boolean {
    if (!this.audioElement) return this.paused;
    if (this.paused) {
      this.audioElement.play();
      this.paused = false;
    } else {
      this.audioElement.pause();
      this.paused = true;
    }
    return this.paused;
  }

  get isPaused(): boolean { return this.paused; }

  getWaveform(): Uint8Array | null {
    if (!this.analyser || !this.waveformData) return null;
    this.analyser.getByteTimeDomainData(this.waveformData);
    return this.waveformData;
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
  }

  dispose(): void {
    this.stop();
    this.source?.disconnect();
    this.gainNode?.disconnect();
    this.analyser?.disconnect();
    this.context?.close();
    if (this.audioElement) {
      this.audioElement.src = '';
    }
    this.context = null;
    this.analyser = null;
    this.gainNode = null;
    this.source = null;
    this.audioElement = null;
    this.frequencyData = null;
    this.waveformData = null;
    this.paused = false;
    this.onEnded = null;
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

    this.rafId = requestAnimationFrame(this.poll);
  };
}
