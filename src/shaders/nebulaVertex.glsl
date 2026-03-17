uniform float uSize;
varying vec2 vUv;
varying float vDepth;

void main() {
  vUv = uv;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vDepth = -mvPosition.z;
  gl_PointSize = uSize * (300.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
