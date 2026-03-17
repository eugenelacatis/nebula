import * as THREE from 'three';

const BASE_STAR_COUNT = 8000;
const FIELD_RADIUS = 500;

export class StarField {
  public points: THREE.Points;
  public streaks: THREE.LineSegments;

  private positions: Float32Array;
  private velocities: Float32Array;
  private starCount: number;

  constructor(density: number = 0.5) {
    this.starCount = Math.floor(BASE_STAR_COUNT * density);

    // Points geometry
    const pointsGeometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(this.starCount * 3);
    this.velocities = new Float32Array(this.starCount);

    for (let i = 0; i < this.starCount; i++) {
      const i3 = i * 3;
      this.positions[i3] = (Math.random() - 0.5) * FIELD_RADIUS;
      this.positions[i3 + 1] = (Math.random() - 0.5) * FIELD_RADIUS;
      this.positions[i3 + 2] = -Math.random() * FIELD_RADIUS;
      this.velocities[i] = 0.5 + Math.random() * 0.5;
    }

    pointsGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.positions, 3)
    );

    const pointsMaterial = new THREE.PointsMaterial({
      color: 0xc8d0e0,
      size: 1.5,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9,
    });

    this.points = new THREE.Points(pointsGeometry, pointsMaterial);

    // Streak lines geometry
    const streakGeometry = new THREE.BufferGeometry();
    const streakPositions = new Float32Array(this.starCount * 6); // 2 verts per line
    streakGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(streakPositions, 3)
    );

    const streakMaterial = new THREE.LineBasicMaterial({
      color: 0xc8d0e0,
      transparent: true,
      opacity: 0.0, // Hidden initially (idle state)
    });

    this.streaks = new THREE.LineSegments(streakGeometry, streakMaterial);
  }

  update(warpSpeed: number, streakMultiplier: number, showStreaks: boolean): void {
    const posAttr = this.points.geometry.attributes.position as THREE.BufferAttribute;
    const streakAttr = this.streaks.geometry.attributes.position as THREE.BufferAttribute;
    const streakMat = this.streaks.material as THREE.LineBasicMaterial;

    streakMat.opacity = showStreaks ? 0.4 : 0.0;

    for (let i = 0; i < this.starCount; i++) {
      const i3 = i * 3;
      const speed = warpSpeed * this.velocities[i];

      // Move star toward camera (positive Z)
      this.positions[i3 + 2] += speed;

      // Recycle star behind camera
      if (this.positions[i3 + 2] > 10) {
        this.positions[i3] = (Math.random() - 0.5) * FIELD_RADIUS;
        this.positions[i3 + 1] = (Math.random() - 0.5) * FIELD_RADIUS;
        this.positions[i3 + 2] = -FIELD_RADIUS;
      }

      // Update streak line (from star position, trailing behind by streak length)
      const streakLength = speed * streakMultiplier * 2;
      const si = i * 6;
      streakAttr.array[si] = this.positions[i3];
      streakAttr.array[si + 1] = this.positions[i3 + 1];
      streakAttr.array[si + 2] = this.positions[i3 + 2];
      streakAttr.array[si + 3] = this.positions[i3];
      streakAttr.array[si + 4] = this.positions[i3 + 1];
      streakAttr.array[si + 5] = this.positions[i3 + 2] - streakLength;
    }

    posAttr.needsUpdate = true;
    streakAttr.needsUpdate = true;
  }

  dispose(): void {
    this.points.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
    this.streaks.geometry.dispose();
    (this.streaks.material as THREE.Material).dispose();
  }
}
