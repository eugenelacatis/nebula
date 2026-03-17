import * as THREE from 'three';

export class CameraRig {
  public camera: THREE.PerspectiveCamera;
  private baseSpeed = 0.3;
  private zRotation = 0;

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 2000);
    this.camera.position.set(0, 0, 0);
    this.camera.lookAt(0, 0, -1);
  }

  update(
    warpSpeed: number,
    bass: number,
    shakeIntensity: number,
    isIdle: boolean
  ): void {
    const speed = isIdle ? this.baseSpeed : warpSpeed;

    // Forward fly (camera doesn't actually move — stars move toward camera)
    // But we apply shake
    if (!isIdle) {
      const shakeAmount = bass * shakeIntensity * 0.3;
      this.camera.position.x = (Math.random() - 0.5) * shakeAmount;
      this.camera.position.y = (Math.random() - 0.5) * shakeAmount;
    } else {
      // Idle: slight Z-axis rotation for calm drift feel
      this.zRotation += 0.001;
      this.camera.rotation.z = Math.sin(this.zRotation) * 0.02;
      this.camera.position.x = 0;
      this.camera.position.y = 0;
    }
  }

  resize(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  dispose(): void {
    // Nothing to dispose for camera
  }
}
