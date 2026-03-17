import * as THREE from 'three';

// Placeholder for Phase 2+ nebula particle system
// In scaffold, this is a stub that can be extended later
export class Nebula {
  public group: THREE.Group;

  constructor() {
    this.group = new THREE.Group();
  }

  update(intensity: number, mids: number, primaryColor: string, secondaryColor: string): void {
    // Will be implemented in Phase 3 (Scene domain)
  }

  dispose(): void {
    this.group.children.forEach((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    });
  }
}
