import * as THREE from "three";
import type { SceneConfig } from "@/config/sceneConfig";

const STAR_COUNT = 6000;
const Z_SPREAD = 2000;
const XY_SPREAD = 400;
const RESET_Z = 10;
const FAR_Z = -Z_SPREAD;

export class StarField {
  readonly mesh: THREE.Points;
  private positions: Float32Array;
  private colors: Float32Array;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;

  constructor() {
    this.positions = new Float32Array(STAR_COUNT * 3);
    this.colors = new Float32Array(STAR_COUNT * 3);

    for (let i = 0; i < STAR_COUNT; i++) {
      this.positions[i * 3] = (Math.random() - 0.5) * XY_SPREAD;
      this.positions[i * 3 + 1] = (Math.random() - 0.5) * XY_SPREAD;
      this.positions[i * 3 + 2] = (Math.random() - 1) * Z_SPREAD;
      this.colors[i * 3] = 1;
      this.colors[i * 3 + 1] = 1;
      this.colors[i * 3 + 2] = 1;
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute("color", new THREE.BufferAttribute(this.colors, 3));

    this.material = new THREE.PointsMaterial({
      size: 0.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: true,
    });

    this.mesh = new THREE.Points(this.geometry, this.material);
  }

  update(bass: number, config: SceneConfig) {
    const speed = config.warpSpeedBase * (1 + bass * 2);
    const streakScale = config.streakLengthMultiplier;
    const primary = new THREE.Color(config.primaryColor);
    const secondary = new THREE.Color(config.secondaryColor);

    const posAttr = this.geometry.attributes.position as THREE.BufferAttribute;
    const colAttr = this.geometry.attributes.color as THREE.BufferAttribute;

    for (let i = 0; i < STAR_COUNT; i++) {
      this.positions[i * 3 + 2] += speed * streakScale * 0.5;

      if (this.positions[i * 3 + 2] > RESET_Z) {
        this.positions[i * 3] = (Math.random() - 0.5) * XY_SPREAD;
        this.positions[i * 3 + 1] = (Math.random() - 0.5) * XY_SPREAD;
        this.positions[i * 3 + 2] = FAR_Z;
      }

      // Alternate between primary and secondary color
      const c = i % 2 === 0 ? primary : secondary;
      this.colors[i * 3] = c.r;
      this.colors[i * 3 + 1] = c.g;
      this.colors[i * 3 + 2] = c.b;
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
