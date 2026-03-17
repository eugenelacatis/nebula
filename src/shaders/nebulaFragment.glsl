// Nebula fragment shader stub — Phase 3 (Scene domain)
uniform vec3 uColor;
uniform float uOpacity;
varying vec2 vUv;

void main() {
  float dist = length(vUv - 0.5);
  float alpha = smoothstep(0.5, 0.0, dist) * uOpacity;
  gl_FragColor = vec4(uColor, alpha);
}
