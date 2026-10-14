export const gridVert = `
  varying vec3 vColor;
  varying vec3 vWorldPos;
  varying vec3 vNormalW;

  #include <fog_pars_vertex>

  void main() {
    vColor = instanceColor;
    vec4 worldPosition = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vWorldPos = worldPosition.xyz;
    vNormalW = normalize(mat3(modelMatrix) * vec3(0.0, 0.0, 1.0));

    vec4 mvPosition = viewMatrix * worldPosition;
    gl_Position = projectionMatrix * mvPosition;

    #include <fog_vertex>
  }
`;

export const gridFrag = `
  uniform vec3 uFresnelColor;
  uniform float uOpacity;
  varying vec3 vColor;
  varying vec3 vWorldPos;
  varying vec3 vNormalW;

  #include <fog_pars_fragment>

  void main() {
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float fresnel = pow(1.0 - max(dot(normalize(vNormalW), viewDir), 0.0), 2.2);
    vec3 col = vColor + uFresnelColor * fresnel * 0.6;
    gl_FragColor = vec4(col, uOpacity);

    #include <fog_fragment>
  }
`;
