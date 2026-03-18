import * as THREE from 'three';
import { CameraRig } from './CameraRig';
import { ParticleRush } from './ParticleRush';
import { Nebula } from './Nebula';
import { AudioSphere } from './AudioSphere';
import { PostProcessing } from './PostProcessing';
import { useAudioStore } from '@/store/audioStore';
import { useControlsStore } from '@/store/controlsStore';
import { liveConfig } from '@/lib/transitions';

export class SceneManager {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private cameraRig: CameraRig;
  private particles: ParticleRush;
  private nebula: Nebula;
  private sphere: AudioSphere;
  private postProcessing: PostProcessing;
  private canvas: HTMLCanvasElement;

  private rafId: number | null = null;
  private lastTime = 0;
  private reactivityScale = 0;
  private reacting = false;

  // Pointer drag state
  private isDragging = false;
  private lastPointerX = 0;
  private lastPointerY = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.NoToneMapping;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    this.cameraRig = new CameraRig();
    this.particles = new ParticleRush(this.scene);
    this.nebula = new Nebula(this.scene);
    this.sphere = new AudioSphere(this.scene);
    this.postProcessing = new PostProcessing(
      this.renderer,
      this.scene,
      this.cameraRig.camera
    );

    window.addEventListener('resize', this.onResize);
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointerleave', this.onPointerUp);
    this.startLoop();
  }

  startReactivity() {
    this.reacting = true;
  }

  private startLoop() {
    const loop = (time: number) => {
      this.rafId = requestAnimationFrame(loop);
      const delta = Math.min((time - this.lastTime) / 1000, 0.05);
      this.lastTime = time;
      this.update(delta);
      this.postProcessing.composer.render();
    };
    this.rafId = requestAnimationFrame(loop);
  }

  private update(delta: number) {
    if (this.reacting) {
      this.reactivityScale = Math.min(1, this.reactivityScale + delta * 0.9);
    }

    const audio = useAudioStore.getState();
    const ctrl = useControlsStore.getState();
    const cfg = liveConfig;
    const r = this.reactivityScale * ctrl.reactivityGain;

    const bass = audio.smoothedBass * r;
    const mids = audio.smoothedMids * r;
    const highs = audio.smoothedHighs * r;
    const energy = audio.smoothedEnergy * r;
    const beat = audio.beat && r > 0.05;

    // ── visibility ──────────────────────────────────────────────────────────
    this.particles.points.visible = ctrl.particlesEnabled;
    this.nebula.mesh.visible = ctrl.nebulaEnabled;
    this.sphere.group.visible = ctrl.sphereEnabled;
    this.sphere.group.scale.setScalar(ctrl.sphereScale);
    this.sphere.setWireframeVisible(ctrl.sphereWireframe);

    // ── camera ──────────────────────────────────────────────────────────────
    this.cameraRig.update(
      bass,
      energy,
      cfg.cameraShakeIntensity * ctrl.cameraShake,
      beat,
      delta,
      ctrl.cameraSway
    );

    // ── particles ────────────────────────────────────────────────────────────
    this.particles.update(
      delta,
      energy,
      audio.bass * r,
      bass,
      beat,
      cfg.warpSpeedBase * ctrl.particleSpeed,
      ctrl.particleSize,
      cfg.primaryColor,
      cfg.accentColor,
      mids,
      highs
    );

    // ── sphere ────────────────────────────────────────────────────────────────
    this.sphere.update(
      delta,
      audio.frequencyData,
      bass,
      mids,
      highs,
      energy,
      beat,
      ctrl.sphereReactivity,
      cfg.primaryColor,
      cfg.secondaryColor,
      cfg.accentColor
    );

    // ── nebula ───────────────────────────────────────────────────────────────
    this.nebula.update(
      delta,
      cfg.primaryColor,
      cfg.secondaryColor,
      cfg.nebulaIntensity * (0.35 + energy * 0.65)
    );

    // ── bloom ────────────────────────────────────────────────────────────────
    this.postProcessing.update(
      cfg.bloomStrengthBase * ctrl.bloomStrength,
      energy,
      beat
    );
  }

  private onPointerDown = (e: PointerEvent) => {
    this.isDragging = true;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.isDragging) return;
    const dx = e.clientX - this.lastPointerX;
    const dy = e.clientY - this.lastPointerY;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
    this.sphere.applyDrag(dx * 0.005, dy * 0.005);
  };

  private onPointerUp = () => {
    this.isDragging = false;
  };

  private onResize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.cameraRig.resize(w, h);
    this.postProcessing.resize(w, h);
  };

  dispose() {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.onResize);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointerleave', this.onPointerUp);
    this.particles.dispose();
    this.nebula.dispose();
    this.sphere.dispose();
    this.postProcessing.dispose();
    this.renderer.dispose();
  }
}
