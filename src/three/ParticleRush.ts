import * as THREE from "three";
import type { SceneConfig } from "@/config/sceneConfig";

const BASE_COUNT = 1000;

export class ParticleRush {
  readonly mesh: THREE.LineSegments;
  private positions: Float32Array;
  private geometry: THREE.BufferGeometry;
  private material: THREE.LineBasicMaterial;
  private count: number;

  constructor() {
    this.count = BASE_COUNT;
    // Each segment = 2 points
    this.positions = new Float32Array(this.count * 6);
    this.initPositions();

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));

    this.material = new THREE.LineBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.4,
    });

    this.mesh = new THREE.LineSegments(this.geometry, this.material);
  }

  private initPositions() {
    for (let i = 0; i < this.count; i++) {
      const x = (Math.random() - 0.5) * 300;
      const y = (Math.random() - 0.5) * 300;
      const z = (Math.random() - 1) * 1000;
      // Start point
      this.positions[i * 6] = x;
      this.positions[i * 6 + 1] = y;
      this.positions[i * 6 + 2] = z;
      // End point (slightly closer)
      this.positions[i * 6 + 3] = x;
      this.positions[i * 6 + 4] = y;
      this.positions[i * 6 + 5] = z + 5;
    }
  }

  update(bass: number, config: SceneConfig) {
    const speed = config.warpSpeedBase * (1 + bass * 3);
    const primaryColor = new THREE.Color(config.primaryColor);
    this.material.color = primaryColor;

    const posAttr = this.geometry.attributes.position as THREE.BufferAttribute;

    for (let i = 0; i < this.count; i++) {
      this.positions[i * 6 + 2] += speed;
      this.positions[i * 6 + 5] += speed;

      if (this.positions[i * 6 + 5] > 10) {
        const x = (Math.random() - 0.5) * 300;
        const y = (Math.random() - 0.5) * 300;
        const z = -1000;
        this.positions[i * 6] = x;
        this.positions[i * 6 + 1] = y;
        this.positions[i * 6 + 2] = z;
        this.positions[i * 6 + 3] = x;
        this.positions[i * 6 + 4] = y;
        this.positions[i * 6 + 5] = z + 5;
      }
    }

    posAttr.needsUpdate = true;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
