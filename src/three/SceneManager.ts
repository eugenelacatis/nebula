import * as THREE from 'three';
import { StarField } from './StarField';
import { CameraRig } from './CameraRig';
import { PostProcessing } from './PostProcessing';
import { useAudioStore } from '@/store/audioStore';
import { useSceneStore } from '@/store/sceneStore';
import { useAppStore } from '@/store/appStore';

export class SceneManager {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private cameraRig: CameraRig;
  private starField: StarField;
  private postProcessing: PostProcessing;
  private rafId: number | null = null;
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x0a0a1a);
    container.appendChild(this.renderer.domElement);

    // Scene
    this.scene = new THREE.Scene();

    // Camera
    this.cameraRig = new CameraRig(width / height);
    this.scene.add(this.cameraRig.camera);

    // Star field (idle density = 0.5 => ~4000 stars)
    this.starField = new StarField(0.5);
    this.scene.add(this.starField.points);
    this.scene.add(this.starField.streaks);

    // Post-processing (bloom)
    this.postProcessing = new PostProcessing(
      this.renderer,
      this.scene,
      this.cameraRig.camera,
      width,
      height
    );

    // Resize listener
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
    const warpSpeed = isIdle ? 0.3 : config.warpSpeedBase;
    const streakMultiplier = isIdle ? 0 : config.streakLengthMultiplier;
    const showStreaks = !isIdle;

    // Update star field
    this.starField.update(warpSpeed, streakMultiplier, showStreaks);

    // Update camera
    this.cameraRig.update(
      warpSpeed,
      features.bass,
      config.cameraShakeIntensity,
      isIdle
    );

    // Update bloom based on energy
    const bloomStrength = isIdle
      ? 0.4
      : config.bloomStrengthBase + features.energy * 0.5;
    this.postProcessing.updateBloom(bloomStrength);

    // Render via post-processing
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
    this.cameraRig.dispose();
    this.postProcessing.dispose();
    this.renderer.dispose();

    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }

    console.log('[SceneManager] Disposed.');
  }
}
