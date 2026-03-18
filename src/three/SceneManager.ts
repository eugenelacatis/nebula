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
  private starDensity = 0.32;

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
    this.renderer.setClearColor(0x000000);
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();

    this.cameraRig = new CameraRig(width / height);
    this.scene.add(this.cameraRig.camera);

    this.starField = new StarField(this.starDensity);
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

    if (Math.abs(config.starDensity - this.starDensity) > 0.001) {
      this.rebuildStarField(config.starDensity);
    }

    const isIdle = phase === 'idle';
    const isPaused = pipelineRef.current?.isPaused ?? false;
    if (isPaused) {
      this.postProcessing.render();
      return;
    }

    const activityLevel = Math.max(features.bass, features.mids, features.highs, features.energy);
    const isLowActivity = !isIdle && activityLevel < 0.08 && !features.beat;
    const visualIdle = isIdle || isLowActivity;
    const calmMix = isLowActivity ? activityLevel / 0.08 : 1;

    const warpSpeed = visualIdle
      ? 0.28 + calmMix * 0.08
      : config.warpSpeedBase + features.bass * 2.4 + features.energy * 0.9;
    const streakMultiplier = visualIdle
      ? 0.12
      : config.streakLengthMultiplier * (0.4 + features.bass * 0.5);
    const showStreaks = !visualIdle && (features.energy > 0.12 || features.beat);

    this.starField.update(
      warpSpeed,
      streakMultiplier,
      showStreaks,
      visualIdle ? 0 : features.bass,
      visualIdle ? 0 : features.mids,
      visualIdle ? 0 : features.highs,
      visualIdle ? 0 : features.energy,
      config.cosmicTension,
      !visualIdle && features.beat,
      config.accentColor
    );

    this.cameraRig.update(
      warpSpeed,
      visualIdle ? 0 : features.bass,
      config.cameraShakeIntensity,
      visualIdle,
      !visualIdle && features.beat
    );

    this.nebula.update(
      0,
      visualIdle ? 0 : features.mids,
      config.primaryColor,
      config.secondaryColor
    );

    if (!visualIdle && features.beat) {
      this.beatBloom = config.bloomStrengthBase * 0.35 + 0.12;
    }
    this.beatBloom *= 0.8;

    const energyBloom = visualIdle ? 0 : features.energy * 0.18;
    const bloomStrength = visualIdle
      ? 0.18
      : Math.min(0.38, Math.max(config.bloomStrengthBase * 0.35 + energyBloom, this.beatBloom));
    this.postProcessing.updateBloom(bloomStrength, 0.45, 0.82);

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

  private rebuildStarField(density: number): void {
    this.scene.remove(this.starField.points);
    this.scene.remove(this.starField.streaks);
    this.starField.dispose();
    this.starDensity = density;
    this.starField = new StarField(density);
    this.scene.add(this.starField.points);
    this.scene.add(this.starField.streaks);
  }
}
