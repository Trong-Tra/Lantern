import { AdditiveBlending, Color, DoubleSide, ShaderMaterial } from "three";

export function createHaloMaterial() {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: AdditiveBlending,
    uniforms: {
      uIgnition: { value: 0 },
      uColor: { value: new Color("#ffb66f") },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec4 center = modelViewMatrix * vec4(0., 0., 0., 1.);
        center.xy += position.xy;
        gl_Position = projectionMatrix * center;
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform float uIgnition;
      uniform vec3 uColor;
      void main() {
        vec2 p = (vUv - .5) * 2.;
        float r = length(p * vec2(1., .84));
        float glow = exp(-r * r * 5.8) * (1. - smoothstep(.38, 1., r));
        gl_FragColor = vec4(uColor, glow * .045 * uIgnition);
      }
    `,
  });
}

export function createBeamMaterial() {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    uniforms: {
      uIgnition: { value: 0 },
      uColor: { value: new Color("#dfaa70") },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vUv = uv;
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.);
        vNormal = normalize(normalMatrix * normal);
        vView = normalize(-viewPosition.xyz);
        gl_Position = projectionMatrix * viewPosition;
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vView;
      uniform float uIgnition;
      uniform vec3 uColor;
      void main() {
        float facing = pow(abs(dot(normalize(vNormal), normalize(vView))), 1.5);
        float distanceFade = pow(vUv.y, 1.65) * (1. - smoothstep(.9, 1., vUv.y));
        gl_FragColor = vec4(uColor, facing * distanceFade * .048 * uIgnition);
      }
    `,
  });
}
