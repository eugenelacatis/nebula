import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

export class PostProcessing {
  readonly composer: EffectComposer;
  private bloomPass: UnrealBloomPass;
  private baseStrength = 0.8;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera
  ) {
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      this.baseStrength,
      0.4,
      0.28
    );
    this.composer.addPass(this.bloomPass);
  }

  update(bloomStrengthBase: number, energy: number, beat: boolean) {
    this.baseStrength = bloomStrengthBase;
    let strength = bloomStrengthBase + energy * 0.5;
    if (beat) strength += 0.8;
    this.bloomPass.strength = Math.min(strength, 3.0);
  }

  resize(width: number, height: number) {
    this.composer.setSize(width, height);
    this.bloomPass.resolution.set(width, height);
  }

  dispose() {
    this.composer.dispose();
  }
}
