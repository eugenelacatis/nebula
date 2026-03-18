import * as THREE from 'three';

const LOOK_TARGET = new THREE.Vector3(0, 0, -70);

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export class CameraRig {
  readonly camera: THREE.PerspectiveCamera;
  private time = 0;
  private fovTarget = 75;

  constructor() {
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      2500
    );
    this.camera.position.set(0, 0, 200);
    this.camera.lookAt(LOOK_TARGET);
  }

  update(
    bass: number,
    energy: number,
    shakeIntensity: number,
    beat: boolean,
    delta: number,
    swayMultiplier = 1.0
  ) {
    this.time += delta;

    // Slow orbital sway — user feels inside the music
    const swayAmt = (6 + energy * 18) * swayMultiplier;
    const targetX =
      Math.sin(this.time * 0.22) * swayAmt +
      (Math.random() - 0.5) * bass * shakeIntensity * 5;
    const targetY =
      Math.cos(this.time * 0.16) * swayAmt * 0.6 +
      (Math.random() - 0.5) * bass * shakeIntensity * 5;
    const targetZ = 200 + Math.sin(this.time * 0.09) * 18;

    this.camera.position.x = lerp(this.camera.position.x, targetX, 0.04);
    this.camera.position.y = lerp(this.camera.position.y, targetY, 0.04);
    this.camera.position.z = lerp(this.camera.position.z, targetZ, 0.025);

    this.camera.lookAt(LOOK_TARGET);

    // FOV punch on beat — feels like a kick
    if (beat) this.fovTarget = 88;
    else this.fovTarget = lerp(this.fovTarget, 75, 0.12);
    this.camera.fov = lerp(this.camera.fov, this.fovTarget, 0.1);
    this.camera.updateProjectionMatrix();
  }

  resize(width: number, height: number) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  dispose() {}
}
