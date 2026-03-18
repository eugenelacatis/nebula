import * as THREE from "three";
import { StarField } from "./StarField";
import { Nebula } from "./Nebula";
import { ParticleRush } from "./ParticleRush";
import { AudioSphere } from "./AudioSphere";
import { CameraRig } from "./CameraRig";
import { PostProcessing } from "./PostProcessing";
import { useAudioStore } from "@/store/audioStore";
import { useSceneStore } from "@/store/sceneStore";
import { useControlsStore } from "@/store/controlsStore";
import { DEFAULT_SCENE_CONFIG } from "@/config/sceneConfig";
import type { SceneConfig } from "@/config/sceneConfig";

export class SceneManager {
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private cameraRig!: CameraRig;
  private starField!: StarField;
  private nebula!: Nebula;
  private particleRush!: ParticleRush;
  private audioSphere!: AudioSphere;
  private postProcessing!: PostProcessing;
  private rafId: number | null = null;
  private canvas!: HTMLCanvasElement;

  // Lerped config for smooth transitions
  private lerpedConfig: SceneConfig = { ...DEFAULT_SCENE_CONFIG };

  // Drag state
  private dragStart: { x: number; y: number } | null = null;

  init(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#000005");

    // Camera
    this.cameraRig = new CameraRig(w / h);

    // Sub-systems
    this.starField = new StarField();
    this.nebula = new Nebula();
    this.particleRush = new ParticleRush();
    this.audioSphere = new AudioSphere();

    this.scene.add(this.starField.mesh);
    this.scene.add(this.particleRush.mesh);
    this.scene.add(this.audioSphere.mesh);

    // Post processing
    this.postProcessing = new PostProcessing(
      this.renderer,
      this.scene,
      this.cameraRig.camera,
      w,
      h
    );

    // Events
    this.bindEvents();

    // Resize
    window.addEventListener("resize", this.onResize);

    this.loop();
  }

  private bindEvents() {
    const el = this.canvas;
    el.addEventListener("mousedown", this.onMouseDown);
    el.addEventListener("mousemove", this.onMouseMove);
    el.addEventListener("mouseup", this.onMouseUp);
    el.addEventListener("mouseleave", this.onMouseUp);
    el.addEventListener("touchstart", this.onTouchStart, { passive: true });
    el.addEventListener("touchmove", this.onTouchMove, { passive: true });
    el.addEventListener("touchend", this.onMouseUp);
  }

  private onMouseDown = (e: MouseEvent) => {
    this.dragStart = { x: e.clientX, y: e.clientY };
    useControlsStore.getState().setIsDragging(true);
  };

  private onMouseMove = (e: MouseEvent) => {
    if (!this.dragStart) return;
    const dx = e.clientX - this.dragStart.x;
    useControlsStore.getState().setDragDelta({ x: dx, y: 0 });
  };

  private onMouseUp = () => {
    this.dragStart = null;
    useControlsStore.getState().setIsDragging(false);
    // Decay delta to zero
    useControlsStore.getState().setDragDelta({ x: 0, y: 0 });
  };

  private onTouchStart = (e: TouchEvent) => {
    if (e.touches.length > 0) {
      this.dragStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      useControlsStore.getState().setIsDragging(true);
    }
  };

  private onTouchMove = (e: TouchEvent) => {
    if (!this.dragStart || e.touches.length === 0) return;
    const dx = e.touches[0].clientX - this.dragStart.x;
    useControlsStore.getState().setDragDelta({ x: dx, y: 0 });
  };

  private onResize = () => {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.renderer.setSize(w, h);
    this.postProcessing.setSize(w, h);
    this.cameraRig.setAspect(w / h);
  };

  private loop = () => {
    this.rafId = requestAnimationFrame(this.loop);

    const audio = useAudioStore.getState().features;
    const targetConfig = useSceneStore.getState().config;
    const controls = useControlsStore.getState();

    // Lerp numeric config fields
    this.lerpedConfig.warpSpeedBase = THREE.MathUtils.lerp(
      this.lerpedConfig.warpSpeedBase, targetConfig.warpSpeedBase, 0.02
    );
    this.lerpedConfig.bloomStrengthBase = THREE.MathUtils.lerp(
      this.lerpedConfig.bloomStrengthBase, targetConfig.bloomStrengthBase, 0.02
    );
    this.lerpedConfig.cosmicTension = THREE.MathUtils.lerp(
      this.lerpedConfig.cosmicTension, targetConfig.cosmicTension, 0.02
    );
    this.lerpedConfig.cameraShakeIntensity = THREE.MathUtils.lerp(
      this.lerpedConfig.cameraShakeIntensity, targetConfig.cameraShakeIntensity, 0.02
    );
    this.lerpedConfig.nebulaIntensity = THREE.MathUtils.lerp(
      this.lerpedConfig.nebulaIntensity, targetConfig.nebulaIntensity, 0.02
    );
    this.lerpedConfig.streakLengthMultiplier = THREE.MathUtils.lerp(
      this.lerpedConfig.streakLengthMultiplier, targetConfig.streakLengthMultiplier, 0.02
    );
    // Colors: just copy (GSAP handles the actual lerp in sceneStore)
    this.lerpedConfig.primaryColor = targetConfig.primaryColor;
    this.lerpedConfig.secondaryColor = targetConfig.secondaryColor;
    this.lerpedConfig.accentColor = targetConfig.accentColor;
    this.lerpedConfig.backgroundColor = targetConfig.backgroundColor;

    // Update background color
    (this.scene.background as THREE.Color).set(this.lerpedConfig.backgroundColor);

    // Sub-system updates
    this.starField.update(audio.smoothedBass, this.lerpedConfig);
    this.particleRush.update(audio.smoothedBass, this.lerpedConfig);
    // CameraRig first — updates lateralOffset/targetLateralOffset before AudioSphere reads them
    this.cameraRig.update(audio.beat, this.lerpedConfig, controls.dragDelta, controls.isDragging);
    this.audioSphere.update(
      audio.frequencyData,
      this.cameraRig.lateralOffset,
      this.cameraRig.targetLateralOffset
    );
    this.postProcessing.update(audio.smoothedEnergy, this.lerpedConfig.bloomStrengthBase);

    this.postProcessing.composer.render();
  };

  dispose() {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    window.removeEventListener("resize", this.onResize);
    this.canvas.removeEventListener("mousedown", this.onMouseDown);
    this.canvas.removeEventListener("mousemove", this.onMouseMove);
    this.canvas.removeEventListener("mouseup", this.onMouseUp);

    this.starField.dispose();
    this.nebula.dispose();
    this.particleRush.dispose();
    this.audioSphere.dispose();
    this.postProcessing.dispose();
    this.renderer.dispose();
  }
}
