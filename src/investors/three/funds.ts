// The round: where the seed money goes, as a 3D donut. Each slice's angle is its
// share of 2027–28 spending and its height grows with it; on scroll the slices
// rise, then open out so each can be read.

import * as THREE from "three";
import { USE_OF_SEED } from "../../shared/business.ts";
import { clamp, ease, fog, frame, label, stageFloor, lights, placeLabel, span, toStage, type SceneSpec } from "./engine.ts";

const INNER = 0.5;
const OUTER = 1.0;
const SHORT = ["People", "Office, lab, marketing", "Founding pilots", "Cost to serve", "Integrator share"];

export function fundsScene(stage: HTMLElement): SceneSpec {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 40);
  lights(scene);

  stageFloor(scene, 20, -0.01);

  const total = USE_OF_SEED.reduce((s, u) => s + u.amount, 0);
  const group = new THREE.Group();
  scene.add(group);
  let a = Math.PI / 2;
  const greys = [0xe6e6e6, 0xbdbdbd, 0x959595, 0x707070];
  const slices = USE_OF_SEED.map((u, i) => {
    const share = u.amount / total;
    const a0 = a, a1 = a - share * Math.PI * 2;
    a = a1;
    const gap = 0.025;
    const shape = new THREE.Shape();
    shape.absarc(0, 0, OUTER, a0 - gap, a1 + gap, true);
    shape.absarc(0, 0, INNER, a1 + gap * 2, a0 - gap * 2, false);
    shape.closePath();
    const height = 0.12 + share * 1.1;
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 2, curveSegments: 48 });
    geo.rotateX(-Math.PI / 2);
    const key = i === 0;
    const mat = new THREE.MeshStandardMaterial({ color: key ? 0xffcd11 : greys[(i - 1) % greys.length], roughness: 0.4, metalness: 0.15 });
    const mesh = new THREE.Mesh(geo, mat);
    group.add(mesh);
    const mid = (a0 + a1) / 2;
    const el = label(stage, `s3d-label--slice${key ? " is-key" : ""}`, `<strong>${Math.round(share * 100)}%</strong><span>${SHORT[i] ?? u.item}</span><small>RM${u.amount.toFixed(2)}M</small>`);
    return { mesh, mid, height, el, i };
  });
  const centre = label(stage, "s3d-label--centre", `<strong>RM${total.toFixed(1)}M</strong><span>spent in 2027 and 2028</span>`);
  const target = new THREE.Vector3(0, 0.25, 0);
  const dir = new THREE.Vector3();

  return {
    scene,
    camera,
    update({ p, time, w, h }) {
      const wide = w / h > 1.05;
      const spin = -0.4 + p * 0.8 + time * 0.03;
      group.rotation.y = spin;
      dir.set(0, 0.95, 1);
      frame(camera, target, dir, wide ? 3.0 : 1.95, 1.55, 1.0);
      if (!wide) camera.position.y += 0.5;
      // Wide screens: the donut sits right of the copy.
      if (wide) camera.position.x -= 1.15;
      camera.updateMatrixWorld();
      fog(scene, camera, target, 1.0, 2.0);
      const open = ease(span(0.45, 0.8, p));
      for (const s of slices) {
        const rise = ease(span(0.05 + s.i * 0.07, 0.35 + s.i * 0.07, p));
        s.mesh.scale.set(1, Math.max(0.02, s.height * rise), 1);
        const out = open * 0.22;
        s.mesh.position.set(Math.cos(s.mid) * out, 0, -Math.sin(s.mid) * out);
        const anchor = new THREE.Vector3(Math.cos(s.mid) * (OUTER + out + 0.12), s.height * rise + 0.05, -Math.sin(s.mid) * (OUTER + out + 0.12)).applyAxisAngle(new THREE.Vector3(0, 1, 0), spin);
        placeLabel(s.el, toStage(anchor, camera, w, h), clamp((rise - 0.6) / 0.4));
      }
      placeLabel(centre, toStage(new THREE.Vector3(0, 0.05, 0), camera, w, h), clamp(p * 4));
    },
  };
}
