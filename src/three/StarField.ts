import * as THREE from 'three';

const BASE_STAR_COUNT = 8000;
const FIELD_RADIUS = 500;

export class StarField {
  public points: THREE.Points;
  public streaks: THREE.LineSegments;

  private positions: Float32Array;
  private velocities: Float32Array;
  private starCount: number;
  private beatStreakBoost = 0;

  constructor(density: number = 0.5) {
    this.starCount = Math.floor(BASE_STAR_COUNT * density);

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
      vertexColors: false,
    });

    this.points = new THREE.Points(pointsGeometry, pointsMaterial);

    const streakGeometry = new THREE.BufferGeometry();
    const streakPositions = new Float32Array(this.starCount * 6);
    streakGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(streakPositions, 3)
    );

    const streakMaterial = new THREE.LineBasicMaterial({
      color: 0xc8d0e0,
      transparent: true,
      opacity: 0.0,
    });

    this.streaks = new THREE.LineSegments(streakGeometry, streakMaterial);
  }

  update(
    warpSpeed: number,
    streakMultiplier: number,
    showStreaks: boolean,
    mids: number,
    highs: number,
    beat: boolean,
    accentColor: string
  ): void {
    const posAttr = this.points.geometry.attributes.position as THREE.BufferAttribute;
    const streakAttr = this.streaks.geometry.attributes.position as THREE.BufferAttribute;
    const pointsMat = this.points.material as THREE.PointsMaterial;
    const streakMat = this.streaks.material as THREE.LineBasicMaterial;

    if (beat) {
      this.beatStreakBoost = 3.0;
    }
    this.beatStreakBoost = Math.max(1.0, this.beatStreakBoost * 0.88);

    const brightness = 0.5 + mids * 0.8;
    const blueShift = highs * 0.7;
    const r = Math.max(0, brightness - blueShift * 0.3);
    const g = Math.max(0, brightness - blueShift * 0.1);
    const b = Math.min(1, brightness + blueShift * 0.5);
    pointsMat.color.setRGB(r, g, b);
    pointsMat.opacity = 0.7 + mids * 0.3;

    if (beat) {
      const accent = new THREE.Color(accentColor);
      streakMat.color.set(accent);
    } else {
      streakMat.color.setRGB(r, g, b);
    }
    streakMat.opacity = showStreaks ? 0.35 + mids * 0.2 : 0.0;

    const effectiveStreak = streakMultiplier * this.beatStreakBoost;

    for (let i = 0; i < this.starCount; i++) {
      const i3 = i * 3;
      const speed = warpSpeed * this.velocities[i];

      this.positions[i3 + 2] += speed;

      if (this.positions[i3 + 2] > 10) {
        this.positions[i3] = (Math.random() - 0.5) * FIELD_RADIUS;
        this.positions[i3 + 1] = (Math.random() - 0.5) * FIELD_RADIUS;
        this.positions[i3 + 2] = -FIELD_RADIUS;
      }

      const streakLength = speed * effectiveStreak * 2;
      const si = i * 6;
      (streakAttr.array as Float32Array)[si] = this.positions[i3];
      (streakAttr.array as Float32Array)[si + 1] = this.positions[i3 + 1];
      (streakAttr.array as Float32Array)[si + 2] = this.positions[i3 + 2];
      (streakAttr.array as Float32Array)[si + 3] = this.positions[i3];
      (streakAttr.array as Float32Array)[si + 4] = this.positions[i3 + 1];
      (streakAttr.array as Float32Array)[si + 5] = this.positions[i3 + 2] - streakLength;
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
