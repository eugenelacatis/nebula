import * as THREE from 'three';

const STAR_COUNT = 8000;
const FIELD_DEPTH = 2000;
const FIELD_SPREAD = 400;

function hexToRgb(hex: string): THREE.Color {
  try {
    return new THREE.Color(hex);
  } catch {
    return new THREE.Color(0xffffff);
  }
}

export class StarField {
  readonly points: THREE.Points;
  readonly streaks: THREE.LineSegments;

  private positions: Float32Array;
  private streakPositions: Float32Array;
  private colors: Float32Array;

  constructor(scene: THREE.Scene) {
    // Stars
    this.positions = new Float32Array(STAR_COUNT * 3);
    this.colors = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i++) {
      this.randomizeStar(i, 0);
    }

    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 1.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
    });

    this.points = new THREE.Points(starGeo, starMat);
    scene.add(this.points);

    // Streaks (2 vertices per star = 2 * STAR_COUNT * 3 floats)
    this.streakPositions = new Float32Array(STAR_COUNT * 2 * 3);
    const streakGeo = new THREE.BufferGeometry();
    streakGeo.setAttribute('position', new THREE.BufferAttribute(this.streakPositions, 3));

    const streakMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
    });

    // Build index pairs
    const indices = new Uint32Array(STAR_COUNT * 2);
    for (let i = 0; i < STAR_COUNT; i++) {
      indices[i * 2] = i * 2;
      indices[i * 2 + 1] = i * 2 + 1;
    }
    streakGeo.setIndex(new THREE.BufferAttribute(indices, 1));

    this.streaks = new THREE.LineSegments(streakGeo, streakMat);
    scene.add(this.streaks);
  }

  private randomizeStar(i: number, cameraZ: number) {
    this.positions[i * 3 + 0] = (Math.random() - 0.5) * FIELD_SPREAD;
    this.positions[i * 3 + 1] = (Math.random() - 0.5) * FIELD_SPREAD;
    this.positions[i * 3 + 2] = cameraZ - Math.random() * FIELD_DEPTH;
    this.colors[i * 3 + 0] = 0.8 + Math.random() * 0.2;
    this.colors[i * 3 + 1] = 0.8 + Math.random() * 0.2;
    this.colors[i * 3 + 2] = 1.0;
  }

  update(
    cameraZ: number,
    warpSpeed: number,
    mids: number,
    streakLengthMultiplier: number,
    secondaryColor: string,
    beat: boolean
  ) {
    const posAttr = this.points.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colorAttr = this.points.geometry.getAttribute('color') as THREE.BufferAttribute;
    const streakAttr = this.streaks.geometry.getAttribute('position') as THREE.BufferAttribute;

    const targetColor = hexToRgb(secondaryColor);
    const brightness = 0.85 + mids * 0.15;
    const streakLen = streakLengthMultiplier * 20 * Math.max(warpSpeed, 0.3);
    const beatMultiplier = beat ? 1.5 : 1.0;

    for (let i = 0; i < STAR_COUNT; i++) {
      const z = this.positions[i * 3 + 2];

      // Recycle star if camera has passed it
      if (z > cameraZ + 100) {
        this.randomizeStar(i, cameraZ);
      }

      // Lerp star color toward secondaryColor
      const r = this.colors[i * 3 + 0];
      const g = this.colors[i * 3 + 1];
      const b = this.colors[i * 3 + 2];
      this.colors[i * 3 + 0] = r + (targetColor.r * brightness - r) * 0.02;
      this.colors[i * 3 + 1] = g + (targetColor.g * brightness - g) * 0.02;
      this.colors[i * 3 + 2] = b + (targetColor.b * brightness - b) * 0.02;

      // Streak: tail is at star z, head is behind by streakLen
      const sx = this.positions[i * 3 + 0];
      const sy = this.positions[i * 3 + 1];
      const sz = this.positions[i * 3 + 2];
      streakAttr.setXYZ(i * 2, sx, sy, sz);
      streakAttr.setXYZ(i * 2 + 1, sx, sy, sz + streakLen * beatMultiplier);
    }

    posAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
    streakAttr.needsUpdate = true;

    // Adjust streak opacity to warp speed
    (this.streaks.material as THREE.LineBasicMaterial).opacity = Math.min(0.6, warpSpeed * 0.2);
  }

  dispose() {
    this.points.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
    this.streaks.geometry.dispose();
    (this.streaks.material as THREE.Material).dispose();
  }
}
