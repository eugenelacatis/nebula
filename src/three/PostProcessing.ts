import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

export class PostProcessing {
  readonly composer: EffectComposer;
  private bloomPass: UnrealBloomPass;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    width: number,
    height: number
  ) {
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      1.2,
      0.4,
      0.85
    );
    this.composer.addPass(this.bloomPass);
  }

  update(energy: number, bloomStrengthBase: number) {
    this.bloomPass.strength = bloomStrengthBase * (0.5 + energy * 0.8);
  }

  setSize(width: number, height: number) {
    this.composer.setSize(width, height);
  }

  dispose() {
    this.composer.dispose();
  }
}
