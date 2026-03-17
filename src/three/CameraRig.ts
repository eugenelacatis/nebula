import * as THREE from 'three';

type MouseLookWindow = Window & { __nebulaMouseLook?: { x: number; y: number } };

export class CameraRig {
  public camera: THREE.PerspectiveCamera;
  private baseSpeed = 0.3;
  private zRotation = 0;
  private lurchZ = 0;
  private smoothYaw = 0;
  private smoothPitch = 0;

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 2000);
    this.camera.position.set(0, 0, 0);
    this.camera.lookAt(0, 0, -1);
  }

  update(
    warpSpeed: number,
    bass: number,
    shakeIntensity: number,
    isIdle: boolean,
    beat: boolean
  ): void {
    if (!isIdle) {
      if (beat) {
        this.lurchZ = -2.0;
      }
      this.lurchZ *= 0.78;

      const shakeAmount = bass * shakeIntensity * 0.8;
      this.camera.position.x = (Math.random() - 0.5) * shakeAmount;
      this.camera.position.y = (Math.random() - 0.5) * shakeAmount;
      this.camera.position.z = this.lurchZ;

      const mouse = (window as MouseLookWindow).__nebulaMouseLook ?? { x: 0, y: 0 };
      this.smoothYaw += (mouse.x * 0.55 - this.smoothYaw) * 0.05;
      this.smoothPitch += (-mouse.y * 0.35 - this.smoothPitch) * 0.05;
      this.camera.rotation.y = this.smoothYaw;
      this.camera.rotation.x = this.smoothPitch;
    } else {
      this.zRotation += 0.001;
      this.camera.rotation.z = Math.sin(this.zRotation) * 0.02;
      this.camera.rotation.y = 0;
      this.camera.rotation.x = 0;
      this.camera.position.set(0, 0, 0);
      this.lurchZ = 0;
      this.smoothYaw = 0;
      this.smoothPitch = 0;
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
