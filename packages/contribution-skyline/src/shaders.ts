export const barVert = `
  varying vec3 vColor;
  varying vec2 vUv;
  #include <fog_pars_vertex>

  void main() {
    vColor = instanceColor;
    vUv = uv;
    vec4 mvPosition = viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

export const barFrag = `
  uniform float uOpacity;
  varying vec3 vColor;
  varying vec2 vUv;
  #include <fog_pars_fragment>

  void main() {
    float edge = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
    float rim = 1.0 - smoothstep(0.03, 0.09, edge);
    vec3 col = vColor * (0.45 + rim * 1.1);
    gl_FragColor = vec4(col, uOpacity * (0.4 + 0.6 * rim));
    #include <fog_fragment>
  }
`;
