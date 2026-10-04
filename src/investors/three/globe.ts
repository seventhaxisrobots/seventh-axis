// Hero: the Earth turns to Southeast Asia, Kuala Lumpur lights up, and as you
// scroll, routes fly out to Bangkok, Ho Chi Minh City and Jakarta, the markets
// that follow Malaysia. NASA Blue Marble / Black Marble textures.

import * as THREE from "three";
import { clamp, ease, label, placeLabel, span, toStage, type Engine, type SceneSpec } from "./engine.ts";

const rad = THREE.MathUtils.degToRad;
const KL = { lat: 3.139, lon: 101.687, name: "Kuala Lumpur", note: "HQ · first market" };
const NEXT = [
  { lat: 13.756, lon: 100.502, name: "Bangkok", note: "Thailand", left: true },
  { lat: 10.823, lon: 106.63, name: "Ho Chi Minh City", note: "Vietnam", left: false },
  { lat: -6.208, lon: 106.846, name: "Jakarta", note: "Indonesia", left: false },
];

/** Latitude and longitude to a point on the unit sphere, matching three's SphereGeometry UVs. */
const onSphere = (lat: number, lon: number, r = 1) =>
  new THREE.Vector3(Math.cos(rad(lat)) * Math.cos(rad(lon)), Math.sin(rad(lat)), -Math.cos(rad(lat)) * Math.sin(rad(lon))).multiplyScalar(r);

const EARTH_VERT = `
varying vec3 vNormal;
varying vec2 vUv;
void main() {
  vUv = uv;
  vNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const EARTH_FRAG = `
uniform sampler2D uDay;
uniform sampler2D uNight;
uniform vec3 uSun;
varying vec3 vNormal;
varying vec2 vUv;
void main() {
  float d = dot(normalize(vNormal), uSun);
  vec3 day = texture2D(uDay, vUv).rgb;
  vec3 night = texture2D(uNight, vUv).rgb;
  float k = smoothstep(-0.18, 0.22, d);
  vec3 lit = day * (0.18 + 1.05 * max(d, 0.0));
  vec3 dark = night * vec3(1.0, 0.9, 0.62) * 1.8 + day * 0.025;
  gl_FragColor = vec4(mix(dark, lit, k), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const AIR_VERT = `
varying vec3 vNormal;
varying vec3 vView;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vNormal = normalize(mat3(modelMatrix) * normal);
  vView = normalize(cameraPosition - world.xyz);
  gl_Position = projectionMatrix * viewMatrix * world;
}`;

const AIR_FRAG = `
uniform vec3 uSun;
varying vec3 vNormal;
varying vec3 vView;
void main() {
  float rim = pow(1.0 - abs(dot(vNormal, vView)), 3.0);
  float lit = smoothstep(-0.4, 0.5, dot(vNormal, uSun));
  gl_FragColor = vec4(vec3(0.62, 0.78, 1.0) * rim * (0.25 + 0.9 * lit), rim);
}`;

export function globeScene(engine: Engine, stage: HTMLElement): SceneSpec {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  const sun = new THREE.Vector3(-1, 0.45, 0.75).normalize();

  const loader = new THREE.TextureLoader();
  const tex = (url: string) => {
    const t = loader.load(url, () => stage.classList.add("s3d--loaded"));
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  };
  const size = engine.light ? 2048 : 4096;

  const earth = new THREE.Group();
  scene.add(earth);
  const seg = engine.light ? 64 : 128;
  earth.add(
    new THREE.Mesh(
      new THREE.SphereGeometry(1, seg, seg / 2),
      new THREE.ShaderMaterial({
        uniforms: { uDay: { value: tex(`/img/earth-day-${size}.webp`) }, uNight: { value: tex(`/img/earth-night-${size}.webp`) }, uSun: { value: sun } },
        vertexShader: EARTH_VERT,
        fragmentShader: EARTH_FRAG,
      }),
    ),
  );
  scene.add(
    new THREE.Mesh(
      new THREE.SphereGeometry(1.06, 64, 32),
      new THREE.ShaderMaterial({
        uniforms: { uSun: { value: sun } },
        vertexShader: AIR_VERT,
        fragmentShader: AIR_FRAG,
        side: THREE.BackSide,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    ),
  );

  // A field of faint stars far behind.
  const stars = new THREE.BufferGeometry();
  const pts: number[] = [];
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 900; i++) {
    const v = new THREE.Vector3(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1).normalize().multiplyScalar(18 + rnd() * 6);
    pts.push(v.x, v.y, v.z);
  }
  stars.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  scene.add(new THREE.Points(stars, new THREE.PointsMaterial({ color: 0xffffff, size: 0.04, transparent: true, opacity: 0.55, depthWrite: false })));

  // Kuala Lumpur: a yellow pin with a pulsing ring.
  const yellow = new THREE.MeshBasicMaterial({ color: 0xffcd11 });
  const klPos = onSphere(KL.lat, KL.lon, 1.002);
  const pin = new THREE.Mesh(new THREE.SphereGeometry(0.014, 16, 12), yellow);
  pin.position.copy(klPos);
  earth.add(pin);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffcd11, transparent: true, side: THREE.DoubleSide, depthWrite: false });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.02, 0.026, 48), ringMat);
  ring.position.copy(klPos);
  ring.lookAt(klPos.clone().multiplyScalar(2));
  earth.add(ring);

  // Routes to the next markets.
  const routes = NEXT.map((c) => {
    const to = onSphere(c.lat, c.lon, 1.002);
    const mid = klPos.clone().add(to).multiplyScalar(0.5);
    const lift = 1 + klPos.distanceTo(to) * 0.55;
    const curve = new THREE.QuadraticBezierCurve3(klPos, mid.normalize().multiplyScalar(lift), to);
    const segs = 64, radial = 6;
    const geo = new THREE.TubeGeometry(curve, segs, 0.0035, radial, false);
    const tube = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 }));
    earth.add(tube);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.009, 12, 8), yellow);
    earth.add(head);
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.011, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    dot.position.copy(to);
    earth.add(dot);
    return { c, to, curve, geo, tube, head, dot, total: segs * radial * 6 };
  });

  const klLabel = label(stage, "s3d-label--city is-key", `<strong>${KL.name}</strong><span>${KL.note}</span>`);
  const cityLabels = routes.map((r) => label(stage, `s3d-label--city${r.c.left ? " is-left" : ""}`, `<strong>${r.c.name}</strong><span>${r.c.note}</span>`));
  const steps = [...(stage.closest("section") ?? stage).querySelectorAll<HTMLElement>("[data-step]")];

  const camDir = new THREE.Vector3();
  const world = new THREE.Vector3();
  const visible = (p: THREE.Vector3) => {
    world.copy(p).applyMatrix4(earth.matrixWorld);
    camDir.copy(camera.position).sub(world).normalize();
    return world.clone().normalize().dot(camDir);
  };

  return {
    scene,
    camera,
    update({ p, time, w, h }) {
      // Centre of view: a slow sway over Southeast Asia, settling on Malaysia as you scroll.
      const settle = ease(span(0, 0.5, p));
      const lat = THREE.MathUtils.lerp(14, 4, settle);
      const lon = THREE.MathUtils.lerp(112, 104, settle) + Math.sin(time * 0.12) * 3 * (1 - settle * 0.7);
      earth.rotation.set(rad(lat), -Math.PI / 2 - rad(lon), 0, "XYZ");
      earth.updateMatrixWorld();

      // Wide screens put the globe on the right, behind nothing; tall screens put it low.
      // The globe fills its view box: about 80% of the shorter side, growing as you scroll in.
      const share = THREE.MathUtils.lerp(0.8, 1.02, ease(span(0.05, 0.7, p)));
      const dist = 1.06 / (share * Math.tan(rad(camera.fov / 2)) * Math.min(1, camera.aspect));
      camera.position.set(0, 0, dist);
      camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld();

      const pulse = (time * 0.7) % 1;
      ring.scale.setScalar(1 + pulse * 2.4);
      ringMat.opacity = 0.9 * (1 - pulse);

      routes.forEach((r, i) => {
        const u = ease(span(0.42 + i * 0.1, 0.62 + i * 0.1, p));
        const n = Math.floor((r.total / 36) * u) * 36;
        r.geo.setDrawRange(0, n);
        r.tube.visible = n > 0;
        r.head.visible = u > 0 && u < 1;
        r.head.position.copy(r.curve.getPoint(Math.max(0.001, u)));
        r.dot.visible = u >= 1;
        r.dot.scale.setScalar(u >= 1 ? 1 + 0.4 * Math.sin(time * 3 + i) : 1);
        const at = toStage(r.to.clone().applyMatrix4(earth.matrixWorld), camera, w, h);
        placeLabel(cityLabels[i], at, clamp((u - 0.85) / 0.15) * (visible(r.to) > 0.15 ? 1 : 0));
      });
      placeLabel(klLabel, toStage(klPos.clone().applyMatrix4(earth.matrixWorld), camera, w, h), visible(klPos) > 0.15 ? 1 : 0);

      const step = p < 0.3 ? 0 : p < 0.62 ? 1 : 2;
      steps.forEach((el) => el.classList.toggle("is-on", Number(el.dataset.step) === step));
    },
  };
}
