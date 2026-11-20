import * as THREE from "three";
import { planets, planetSurface, surfaceStyles } from "./solar-scene";

function surfaceTexture(index: number) {
  const width = 512;
  const height = 256;
  const data = new Uint8Array(width * height * 4);
  const color = planets[index].color;
  const rgb = [1, 3, 5].map((offset) => parseInt(color.slice(offset, offset + 2), 16));
  for (let row = 0; row < height; row++) {
    const latitude = (row / (height - 1) - .5) * Math.PI;
    for (let column = 0; column < width; column++) {
      const longitude = column / width * Math.PI * 2;
      const { hue, texture } = planetSurface(index, rgb, longitude, latitude);
      const pixel = (row * width + column) * 4;
      for (let channel = 0; channel < 3; channel++) {
        data[pixel + channel] = Math.min(255, hue[channel] * texture);
      }
      data[pixel + 3] = 255;
    }
  }
  const map = new THREE.DataTexture(data, width, height);
  map.wrapS = THREE.RepeatWrapping;
  map.magFilter = THREE.LinearFilter;
  map.minFilter = THREE.LinearMipmapLinearFilter;
  map.generateMipmaps = true;
  map.needsUpdate = true;
  return map;
}

export function createPlanetModels(canvas: HTMLCanvasElement) {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  } catch {
    return null;
  }
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(0, 1, 0, -1, .1, 200);
  const sphere = new THREE.SphereGeometry(1, 64, 48);
  const viewRotation = new THREE.Quaternion();
  const viewAxis = new THREE.Vector3();
  const bodies = planets.map((planet, index) => {
    const group = new THREE.Group();
    const { tilt } = surfaceStyles[index];
    group.rotation.set(planet.name === "Saturn" ? .34 : 0, 0, -tilt, "ZXY");
    const map = surfaceTexture(index);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        surface: { value: map },
        sunlight: { value: new THREE.Vector3() },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        void main() {
          vUv = uv;
          vNormal = normalMatrix * normal;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D surface;
        uniform vec3 sunlight;
        varying vec2 vUv;
        varying vec3 vNormal;
        void main() {
          vec3 normal = normalize(vNormal);
          float light = max(dot(normal, sunlight), 0.0);
          float terminator = smoothstep(0.0, 0.16, light);
          float limb = pow(1.0 - max(normal.z, 0.0), 4.0);
          float rim = pow(1.0 - max(normal.z, 0.0), 3.0) * light;
          vec3 shade = texture2D(surface, vUv).rgb * (0.04 + pow(light, 0.85) * 0.92);
          vec3 brass = light * vec3(0.16, 0.12, 0.055) + rim * vec3(0.23, 0.15, 0.075);
          vec3 atmosphere = limb * terminator * vec3(0.19, 0.11, 0.045);
          vec3 reflected = vec3(0.043, 0.039, 0.045) * (1.0 - light);
          gl_FragColor = vec4(shade + brass + atmosphere + reflected, 1.0);
        }
      `,
    });
    const mesh = new THREE.Mesh(sphere, material);
    group.add(mesh);
    scene.add(group);
    return { group, restPose: group.quaternion.clone(), material, map };
  });
  const saturn = bodies[planets.findIndex(({ name }) => name === "Saturn")];
  const rings = [[1.33, .023, 0x503928], [1.41, .043, 0x9f7650], [1.53, .068, 0xc5a476], [1.65, .025, 0x6e523a], [1.72, .03, 0xd3b685], [1.8, .015, 0x8d7356]].map(([radius, halfWidth, color]) => {
    const geometry = new THREE.RingGeometry(radius - halfWidth, radius + halfWidth, 96);
    const material = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(geometry, material);
    ring.rotation.x = -Math.PI / 2;
    saturn.group.add(ring);
    return { geometry, material };
  });

  return {
    resize(width: number, height: number, dpr: number) {
      camera.right = width;
      camera.bottom = -height;
      // Screen-space meshes grow in depth as well as width during a close-up.
      camera.position.z = height;
      camera.far = height * 2;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(dpr);
      renderer.setSize(width, height, false);
    },
    place(index: number, x: number, y: number, sunX: number, sunY: number, radius: number, azimuth: number, elevation: number) {
      const { group, restPose, material } = bodies[index];
      group.visible = radius > 0;
      if (!group.visible) return;
      group.position.set(x, -y, 0);
      group.scale.setScalar(radius);
      viewAxis.set(0, Math.cos(elevation), Math.sin(elevation));
      viewRotation.setFromAxisAngle(viewAxis, -azimuth);
      group.quaternion.copy(restPose).premultiply(viewRotation);
      const angle = Math.atan2(y - sunY, sunX - x);
      material.uniforms.sunlight.value.set(Math.cos(angle), Math.sin(angle), .38).normalize();
    },
    render() {
      renderer.render(scene, camera);
    },
    dispose() {
      for (const { material, map } of bodies) {
        material.dispose();
        map.dispose();
      }
      for (const { geometry, material } of rings) {
        geometry.dispose();
        material.dispose();
      }
      sphere.dispose();
      renderer.dispose();
    },
  };
}
