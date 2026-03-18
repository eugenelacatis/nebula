import * as THREE from "three";

const N_PARTICLES = 512;
const ROAD_HALF_WIDTH = 5.5;
const ROAD_LENGTH = 160;
const AUDIO_AMP = 11;
const BASE_Y = -1.5;
const PARTICLE_SIZE = 0.40;

function makeSpriteTex(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.7)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
}

export class AudioSphere {
  readonly mesh: THREE.Group;

  private geoLeft: THREE.BufferGeometry;
  private geoRight: THREE.BufferGeometry;
  private posLeft: Float32Array;
  private posRight: Float32Array;

  constructor() {
    const tex = makeSpriteTex();

    this.posLeft  = new Float32Array(N_PARTICLES * 3);
    this.posRight = new Float32Array(N_PARTICLES * 3);

    this.geoLeft  = new THREE.BufferGeometry();
    this.geoLeft.setAttribute("position",  new THREE.BufferAttribute(this.posLeft,  3));
    this.geoRight = new THREE.BufferGeometry();
    this.geoRight.setAttribute("position", new THREE.BufferAttribute(this.posRight, 3));

    const shared = {
      size: PARTICLE_SIZE,
      map: tex,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    };

    this.mesh = new THREE.Group();
    this.mesh.add(new THREE.Points(this.geoLeft,  new THREE.PointsMaterial({ ...shared, color: 0x00ffdd }))); // cyan
    this.mesh.add(new THREE.Points(this.geoRight, new THREE.PointsMaterial({ ...shared, color: 0xffcc00 }))); // gold
  }

  /**
   * @param frequencyData       normalised 0–1 per bin (256 bins)
   * @param lateralOffset       camera's current x (from CameraRig)
   * @param targetLateralOffset where camera is heading (from CameraRig)
   */
  update(
    frequencyData: Float32Array,
    lateralOffset: number,
    targetLateralOffset: number
  ) {
    const freqLen = frequencyData.length;
    const remaining = targetLateralOffset - lateralOffset;

    for (let i = 0; i < N_PARTICLES; i++) {
      const t = i / (N_PARTICLES - 1); // 0 = near camera, 1 = far
      const z = -t * ROAD_LENGTH;

      // --- Waveform y ---
      // Map t linearly to frequency bins with linear interpolation → no wrapping, no breaks
      const fRaw = t * (freqLen - 2);
      const fi   = Math.floor(fRaw);
      const frac = fRaw - fi;
      const freq = frequencyData[fi] * (1 - frac) + frequencyData[fi + 1] * frac;
      const audioY = (freq - 0.5) * AUDIO_AMP;

      // --- Road x ---
      // Smooth-step curve: near end is straight (at lateralOffset), the bend appears clearly
      // in the mid-distance, far end is straight again at targetLateralOffset.
      // This is what a real chicane corner looks like from the driver's seat.
      const curveFactor = THREE.MathUtils.smoothstep(t, 0.05, 0.65);
      const roadCenterX = lateralOffset + curveFactor * remaining;

      this.posLeft[i * 3]     = roadCenterX - ROAD_HALF_WIDTH;
      this.posLeft[i * 3 + 1] = BASE_Y + audioY;
      this.posLeft[i * 3 + 2] = z;

      this.posRight[i * 3]     = roadCenterX + ROAD_HALF_WIDTH;
      this.posRight[i * 3 + 1] = BASE_Y + audioY;
      this.posRight[i * 3 + 2] = z;
    }

    (this.geoLeft.attributes.position  as THREE.BufferAttribute).needsUpdate = true;
    (this.geoRight.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  dispose() {
    this.geoLeft.dispose();
    this.geoRight.dispose();
    this.mesh.children.forEach((c) => {
      if (c instanceof THREE.Points) (c.material as THREE.Material).dispose();
    });
  }
}
