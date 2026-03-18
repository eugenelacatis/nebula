import * as THREE from 'three';

const BASE_STAR_COUNT = 8000;
const FIELD_RADIUS = 500;

type StructuralEvent = 'none' | 'pulse' | 'opening' | 'collapse';

export class StarField {
  public points: THREE.Points;
  public streaks: THREE.LineSegments;

  private positions: Float32Array;
  private homePositions: Float32Array;
  private velocities: Float32Array;
  private phases: Float32Array;
  private clusterBias: Float32Array;
  private shimmer: Float32Array;
  private starCount: number;
  private beatStreakBoost = 0;
  private eventType: StructuralEvent = 'none';
  private eventStrength = 0;
  private eventCenterX = 0;
  private eventCenterY = 0;
  private time = 0;

  constructor(density: number = 0.5) {
    this.starCount = Math.floor(BASE_STAR_COUNT * density);

    const pointsGeometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(this.starCount * 3);
    this.homePositions = new Float32Array(this.starCount * 3);
    this.velocities = new Float32Array(this.starCount);
    this.phases = new Float32Array(this.starCount);
    this.clusterBias = new Float32Array(this.starCount);
    this.shimmer = new Float32Array(this.starCount);

    for (let i = 0; i < this.starCount; i++) {
      const i3 = i * 3;
      const spawn = this.createSpawnPosition();
      this.positions[i3] = spawn.x;
      this.positions[i3 + 1] = spawn.y;
      this.positions[i3 + 2] = spawn.z;
      this.homePositions[i3] = spawn.x;
      this.homePositions[i3 + 1] = spawn.y;
      this.homePositions[i3 + 2] = spawn.z;
      this.velocities[i] = 0.5 + Math.random() * 0.5;
      this.phases[i] = Math.random() * Math.PI * 2;
      this.clusterBias[i] = 0.35 + Math.random() * 0.65;
      this.shimmer[i] = 0.5 + Math.random() * 0.5;
    }

    pointsGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.positions, 3)
    );

    const pointsMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Vector3(0.78, 0.82, 0.88) },
        uOpacity: { value: 0.78 },
        uSize: { value: 10.0 },
        uSoftness: { value: 0.16 },
      },
      vertexShader: `
        uniform float uSize;
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = uSize * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uOpacity;
        uniform float uSoftness;
        void main() {
          vec2 uv = gl_PointCoord - 0.5;
          float dist = length(uv);
          if (dist > 0.5) discard;
          float alpha = smoothstep(0.5, uSoftness, dist) * uOpacity;
          float core = smoothstep(0.24, 0.0, dist);
          vec3 color = uColor + core * 0.22;
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
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
    bass: number,
    mids: number,
    highs: number,
    energy: number,
    cosmicTension: number,
    beat: boolean,
    accentColor: string
  ): void {
    this.time += 0.01 + warpSpeed * 0.0008;

    const posAttr = this.points.geometry.attributes.position as THREE.BufferAttribute;
    const streakAttr = this.streaks.geometry.attributes.position as THREE.BufferAttribute;
    const pointsMat = this.points.material as THREE.ShaderMaterial;
    const streakMat = this.streaks.material as THREE.LineBasicMaterial;

    if (beat) {
      this.beatStreakBoost = 3.0;
      this.triggerStructuralEvent();
    }
    this.beatStreakBoost = Math.max(1.0, this.beatStreakBoost * 0.88);
    this.eventStrength *= 0.94;
    if (this.eventStrength < 0.03) {
      this.eventType = 'none';
      this.eventStrength = 0;
    }

    const brightness = 0.42 + mids * 0.55 + energy * 0.35;
    const blueShift = highs * 0.45;
    const warmth = bass * 0.15;
    const r = Math.max(0, brightness + warmth - blueShift * 0.35);
    const g = Math.max(0, brightness - blueShift * 0.08);
    const b = Math.min(1, brightness + blueShift * 0.55 + energy * 0.12);
    (pointsMat.uniforms.uColor.value as THREE.Vector3).set(r, g, b);
    pointsMat.uniforms.uOpacity.value = 0.36 + energy * 0.14 + mids * 0.06;
    pointsMat.uniforms.uSize.value = 7.0 + energy * 2.8 + this.eventStrength * 1.2;

    if (beat) {
      const accent = new THREE.Color(accentColor);
      streakMat.color.set(accent);
    } else {
      streakMat.color.setRGB(r, g, b);
    }
    streakMat.opacity = showStreaks
      ? 0.04 + bass * 0.08 + energy * 0.08 + this.eventStrength * 0.12
      : 0.0;

    const effectiveStreak = streakMultiplier * this.beatStreakBoost;
    const gatedBass = Math.max(0, bass - 0.12);
    const gatedMids = Math.max(0, mids - 0.12);
    const gatedHighs = Math.max(0, highs - 0.14);
    const gatedEnergy = Math.max(0, energy - 0.1);
    const flowStrength = 1.4 + gatedMids * 3.8 + gatedHighs * 3.2;
    const cohesion = 0.009 + gatedMids * 0.016 + (1 - cosmicTension) * 0.006;
    const compression = 0.025 + gatedBass * 0.11 + gatedEnergy * 0.08;
    const turbulence = 0.02 + gatedHighs * 0.12 + cosmicTension * 0.05;
    const centerPull = 0.0015 + compression * 0.009;

    for (let i = 0; i < this.starCount; i++) {
      const i3 = i * 3;
      const speed = warpSpeed * this.velocities[i];

      this.homePositions[i3 + 2] += speed;

      if (this.homePositions[i3 + 2] > 12) {
        const spawn = this.createSpawnPosition();
        this.homePositions[i3] = spawn.x;
        this.homePositions[i3 + 1] = spawn.y;
        this.homePositions[i3 + 2] = spawn.z;
      }

      const phase = this.phases[i] + this.time * (0.25 + this.shimmer[i] * 0.35);
      const depthPhase = this.homePositions[i3 + 2] * 0.01 + phase;
      const homeX = this.homePositions[i3];
      const homeY = this.homePositions[i3 + 1];
      const clusterWeight = this.clusterBias[i];
      const swirlX = Math.sin(depthPhase * 1.3) * flowStrength * (0.3 + gatedHighs * 0.18);
      const swirlY = Math.cos(depthPhase * 1.1) * flowStrength * (0.24 + gatedMids * 0.24);
      const bandPull = Math.sin(phase * 0.7) * 8 * compression * clusterWeight;
      const targetX = homeX * (1 - centerPull * clusterWeight) + swirlX + bandPull;
      const targetY = homeY * (1 - centerPull * (0.8 + clusterWeight * 0.4)) + swirlY;

      let eventOffsetX = 0;
      let eventOffsetY = 0;

      if (this.eventType !== 'none') {
        const dx = homeX - this.eventCenterX;
        const dy = homeY - this.eventCenterY;
        const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        const normalizedX = dx / distance;
        const normalizedY = dy / distance;

        if (this.eventType === 'pulse') {
          const wave = Math.sin(distance * 0.08 - this.eventStrength * 8);
          eventOffsetX += normalizedX * wave * this.eventStrength * 10;
          eventOffsetY += normalizedY * wave * this.eventStrength * 10;
        } else if (this.eventType === 'opening') {
          const openingForce = Math.max(0, 1 - distance / 140) * this.eventStrength * 15;
          eventOffsetX += normalizedX * openingForce;
          eventOffsetY += normalizedY * openingForce;
        } else if (this.eventType === 'collapse') {
          const collapseForce = Math.max(0, 1 - distance / 180) * this.eventStrength * 12;
          eventOffsetX -= normalizedX * collapseForce;
          eventOffsetY -= normalizedY * collapseForce;
        }
      }

      this.positions[i3] += (targetX + eventOffsetX - this.positions[i3]) * cohesion;
      this.positions[i3 + 1] += (targetY + eventOffsetY - this.positions[i3 + 1]) * cohesion;
      this.positions[i3] += Math.sin(phase * 2.2) * turbulence * 0.015;
      this.positions[i3 + 1] += Math.cos(phase * 2.0) * turbulence * 0.015;
      this.positions[i3 + 2] = this.homePositions[i3 + 2] + Math.sin(phase) * (1.2 + gatedHighs * 2.4);

      const streakLength = speed * effectiveStreak * (0.4 + gatedBass * 0.8 + this.eventStrength * 0.8);
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

  private createSpawnPosition(): { x: number; y: number; z: number } {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.pow(Math.random(), 0.65) * FIELD_RADIUS * 0.46;
    const bandOffset = (Math.random() - 0.5) * FIELD_RADIUS * 0.22;

    return {
      x: Math.cos(angle) * radius + bandOffset,
      y: Math.sin(angle) * radius * 0.55 + (Math.random() - 0.5) * FIELD_RADIUS * 0.18,
      z: -Math.random() * FIELD_RADIUS,
    };
  }

  private triggerStructuralEvent(): void {
    const eventRoll = Math.random();
    if (eventRoll < 0.7) {
      this.eventType = 'pulse';
    } else if (eventRoll < 0.88) {
      this.eventType = 'opening';
    } else {
      this.eventType = 'collapse';
    }

    this.eventStrength = 0.7;
    this.eventCenterX = (Math.random() - 0.5) * 40;
    this.eventCenterY = (Math.random() - 0.5) * 24;
  }

  dispose(): void {
    this.points.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
    this.streaks.geometry.dispose();
    (this.streaks.material as THREE.Material).dispose();
  }
}
