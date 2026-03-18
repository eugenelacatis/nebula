import * as THREE from "three";
import type { SceneConfig } from "@/config/sceneConfig";

const STEER_SENSITIVITY = 0.35; // pixels → world units per frame delta
const MAX_LATERAL       = 30;   // maximum lateral offset in either direction
const TRAVEL_SPEED      = 0.14; // world units per frame the camera moves through the turn

export class CameraRig {
  readonly camera: THREE.PerspectiveCamera;
  private shakeOffset = new THREE.Vector3();
  private time = 0;

  lateralOffset       = 0; // where the camera IS right now
  targetLateralOffset = 0; // where the camera is HEADING

  private prevDragX = 0;

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 2000);
    this.camera.position.set(0, 0, 5);
  }

  update(
    beat: boolean,
    config: SceneConfig,
    dragDelta: { x: number; y: number },
    isDragging: boolean
  ) {
    this.time += 0.01;

    // --- Chicane steering ---
    // Accumulate target from frame-to-frame drag movement while dragging.
    // On release, target stays → camera travels to it at constant speed.
    if (isDragging) {
      const frameDelta = dragDelta.x - this.prevDragX;
      this.targetLateralOffset = THREE.MathUtils.clamp(
        this.targetLateralOffset + frameDelta * STEER_SENSITIVITY,
        -MAX_LATERAL, MAX_LATERAL
      );
    }
    this.prevDragX = isDragging ? dragDelta.x : 0;

    // Move camera toward target at constant speed
    const remaining = this.targetLateralOffset - this.lateralOffset;
    if (Math.abs(remaining) <= TRAVEL_SPEED) {
      this.lateralOffset = this.targetLateralOffset;
    } else {
      this.lateralOffset += Math.sign(remaining) * TRAVEL_SPEED;
    }

    // --- Beat shake ---
    if (beat) {
      this.shakeOffset.set(
        (Math.random() - 0.5) * config.cameraShakeIntensity * 2,
        (Math.random() - 0.5) * config.cameraShakeIntensity * 2,
        0
      );
    }
    this.shakeOffset.lerp(new THREE.Vector3(0, 0, 0), 0.15);

    // --- Cosmic drift (layered on top of lateral offset) ---
    const drift  = config.cosmicTension * 0.5;
    const driftX = Math.sin(this.time * 0.3) * drift;
    const driftY = Math.cos(this.time * 0.2) * drift;

    this.camera.position.x = THREE.MathUtils.lerp(
      this.camera.position.x,
      this.lateralOffset + driftX + this.shakeOffset.x,
      0.05
    );
    this.camera.position.y = THREE.MathUtils.lerp(
      this.camera.position.y,
      driftY + this.shakeOffset.y,
      0.05
    );
  }

  setAspect(aspect: number) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}
