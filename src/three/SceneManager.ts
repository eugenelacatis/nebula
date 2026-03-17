import * as THREE from 'three';
import { StarField } from './StarField';
import { Nebula } from './Nebula';
import { CameraRig } from './CameraRig';
import { PostProcessing } from './PostProcessing';
import { useAudioStore } from '@/store/audioStore';
import { useSceneStore } from '@/store/sceneStore';
import { useAppStore } from '@/store/appStore';
import { pipelineRef } from '@/audio/pipelineRef';

export class SceneManager {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private cameraRig: CameraRig;
  private starField: StarField;
  private nebula: Nebula;
  private postProcessing: PostProcessing;
  private rafId: number | null = null;
  private container: HTMLElement;
  private beatBloom = 0;

  constructor(container: HTMLElement) {
    this.container = container;
    const width = container.clientWidth;
    const height = container.clientHeight;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x0a0a1a);
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();

    this.cameraRig = new CameraRig(width / height);
    this.scene.add(this.cameraRig.camera);

    this.starField = new StarField(0.5);
    this.scene.add(this.starField.points);
    this.scene.add(this.starField.streaks);

    this.nebula = new Nebula();
    this.scene.add(this.nebula.group);

    this.postProcessing = new PostProcessing(
      this.renderer,
      this.scene,
      this.cameraRig.camera,
      width,
      height
    );

    window.addEventListener('resize', this.onResize);

    console.log('[SceneManager] Initialized. Stars:', Math.floor(8000 * 0.5));
  }

  start(): void {
    if (this.rafId !== null) return;
    this.animate();
    console.log('[SceneManager] Render loop started.');
  }

  private animate = (): void => {
    this.rafId = requestAnimationFrame(this.animate);

    const { features } = useAudioStore.getState();
    const { config } = useSceneStore.getState();
    const { phase } = useAppStore.getState();

    const isIdle = phase === 'idle';
    const isPaused = pipelineRef.current?.isPaused ?? false;
    if (isPaused) {
      this.postProcessing.render();
      return;
    }
    const warpSpeed = isIdle ? 0.3 : config.warpSpeedBase + features.bass * 4.0;
    const streakMultiplier = isIdle ? 0 : config.streakLengthMultiplier;
    const showStreaks = !isIdle;

    this.starField.update(
      warpSpeed,
      streakMultiplier,
      showStreaks,
      isIdle ? 0 : features.mids,
      isIdle ? 0 : features.highs,
      !isIdle && features.beat,
      config.accentColor
    );

    this.cameraRig.update(
      warpSpeed,
      features.bass,
      config.cameraShakeIntensity,
      isIdle,
      !isIdle && features.beat
    );

    this.nebula.update(
      isIdle ? 0 : config.nebulaIntensity,
      isIdle ? 0 : features.mids,
      config.primaryColor,
      config.secondaryColor,
      config.accentColor,
      !isIdle && features.beat
    );

    if (!isIdle && features.beat) {
      this.beatBloom = config.bloomStrengthBase + 1.8;
    }
    this.beatBloom *= 0.82;

    const energyBloom = isIdle ? 0 : features.energy * 1.2;
    const bloomStrength = isIdle
      ? 0.4
      : Math.max(config.bloomStrengthBase + energyBloom, this.beatBloom);
    this.postProcessing.updateBloom(bloomStrength);

    this.postProcessing.render();
  };

  private onResize = (): void => {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.renderer.setSize(width, height);
    this.cameraRig.resize(width / height);
    this.postProcessing.resize(width, height);
  };

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  dispose(): void {
    this.stop();
    window.removeEventListener('resize', this.onResize);
    this.starField.dispose();
    this.nebula.dispose();
    this.cameraRig.dispose();
    this.postProcessing.dispose();
    this.renderer.dispose();

    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }

    console.log('[SceneManager] Disposed.');
  }
}
