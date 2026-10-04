// Cash: five years of month-end cash as a ribbon the camera flies along, with a
// beam at each round and the low point before it marked in yellow.

import * as THREE from "three";
import { CASH_MONTHLY, CASH_START, ROUNDS } from "../../shared/business.ts";
import { clamp, ease, fog, frame, label, lights, placeLabel, span, stageFloor, toStage, type SceneSpec } from "./engine.ts";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const LEN = 7;
const YS = 0.11; // metres per RM million
const DEPTH = 0.34;

export function cashScene(stage: HTMLElement): SceneSpec {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 60);
  lights(scene);

  const n = CASH_MONTHLY.length;
  const X = (i: number) => (i / (n - 1)) * LEN - LEN / 2;
  const Y = (v: number) => v * YS;
  const name = (i: number) => `${MONTHS[(CASH_START.month - 1 + i) % 12]} ${CASH_START.year + Math.floor((CASH_START.month - 1 + i) / 12)}`;

  stageFloor(scene, 30);

  // The ribbon's top surface and the translucent curtain under it, one quad per month.
  const top: number[] = [], curtain: number[] = [], colours: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const x0 = X(i), x1 = X(i + 1), y0 = Y(CASH_MONTHLY[i]), y1 = Y(CASH_MONTHLY[i + 1]);
    const d = DEPTH / 2;
    top.push(x0, y0, -d, x0, y0, d, x1, y1, d, x0, y0, -d, x1, y1, d, x1, y1, -d);
    curtain.push(x0, 0, d, x0, y0, d, x1, y1, d, x0, 0, d, x1, y1, d, x1, 0, d);
    for (const a of [0.02, 0.32, 0.32, 0.02, 0.32, 0.02]) colours.push(1, 1, 1, a);
  }
  const topGeo = new THREE.BufferGeometry();
  topGeo.setAttribute("position", new THREE.Float32BufferAttribute(top, 3));
  topGeo.computeVertexNormals();
  const ribbon = new THREE.Mesh(topGeo, new THREE.MeshStandardMaterial({ color: 0xffcd11, emissive: 0xffcd11, emissiveIntensity: 0.35, roughness: 0.4, side: THREE.DoubleSide }));
  scene.add(ribbon);
  const curtainGeo = new THREE.BufferGeometry();
  curtainGeo.setAttribute("position", new THREE.Float32BufferAttribute(curtain, 3));
  curtainGeo.setAttribute("color", new THREE.Float32BufferAttribute(colours, 4));
  const wall = new THREE.Mesh(curtainGeo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
  scene.add(wall);

  // Year lines across the floor.
  const yearLabels: { el: HTMLElement; x: number }[] = [];
  for (let i = 0; i < n; i++) {
    if ((CASH_START.month - 1 + i) % 12 !== 0) continue;
    const line = new THREE.Mesh(new THREE.PlaneGeometry(0.01, 1.6), new THREE.MeshBasicMaterial({ color: 0x3a3a3a }));
    line.rotation.x = -Math.PI / 2;
    line.position.set(X(i), 0.001, 0.3);
    scene.add(line);
    yearLabels.push({ el: label(stage, "s3d-label--tick", name(i).slice(4)), x: X(i) });
  }

  // A beam of light at each round.
  const monthIndex = (ym: string) => (Number(ym.slice(0, 4)) - CASH_START.year) * 12 + Number(ym.slice(5, 7)) - CASH_START.month;
  const beams = ROUNDS.map((r) => {
    const i = monthIndex(r.month);
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.02, 2.55, 0.02), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }));
    beam.position.set(X(i), 1.275, 0);
    scene.add(beam);
    return { i, beam, el: label(stage, "s3d-label--round", `<strong>${r.name}</strong><span>RM${r.amount}M · ${name(i)}</span>`) };
  });

  // Low points: the month before each round lands.
  const lows = CASH_MONTHLY.map((v, i) => ({ v, i }))
    .filter(({ v, i }) => i < n - 1 && CASH_MONTHLY[i + 1] - v > 1)
    .map(({ v, i }) => {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.05, 24, 16), new THREE.MeshStandardMaterial({ color: 0xffcd11, emissive: 0xffcd11, emissiveIntensity: 0.6 }));
      s.position.set(X(i), Y(v) + 0.05, DEPTH / 2);
      scene.add(s);
      return { i, v, s, el: label(stage, "s3d-label--low", `<strong>Low RM${v.toFixed(2)}M</strong><span>${name(i)}</span>`) };
    });

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.035, 20, 14), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  scene.add(head);
  const readout = label(stage, "s3d-label--readout", "");
  const target = new THREE.Vector3();
  const dir = new THREE.Vector3();

  return {
    scene,
    camera,
    update({ p, time, w, h }) {
      const wide = w / h > 1.05;
      // The ribbon draws out with scroll; the last stretch pulls back to show all five years.
      const draw = span(0.02, 0.86, p);
      const m = draw * (n - 1);
      const i = Math.min(n - 2, Math.floor(m));
      const f = m - i;
      const hx = X(i) + (X(i + 1) - X(i)) * f;
      const hy = Y(CASH_MONTHLY[i] + (CASH_MONTHLY[i + 1] - CASH_MONTHLY[i]) * f);
      topGeo.setDrawRange(0, Math.ceil(m) * 6);
      curtainGeo.setDrawRange(0, Math.ceil(m) * 6);
      head.position.set(hx, hy + 0.02, 0);

      const back = ease(span(0.84, 1, p));
      // Wide screens keep the ribbon right of the copy: the camera looks a little left of it.
      const followTarget = new THREE.Vector3(hx - (wide ? 1.1 : 0.2), Math.max(0.7, hy * 0.6 + 0.5), 0);
      const wholeTarget = new THREE.Vector3(wide ? -2.3 : 0, wide ? 1.2 : 2.3, 0);
      target.lerpVectors(followTarget, wholeTarget, back);
      const swing = Math.sin(time * 0.25) * 0.05;
      dir.set(0.55 - back * 0.45 + swing, 0.42, 1);
      frame(camera, target, dir, THREE.MathUtils.lerp(wide ? 2.7 : 1.2, wide ? 6.6 : LEN / 2 + 0.3, back), THREE.MathUtils.lerp(1.6, 1.95, back), wide ? 1.0 : 1.15);
      camera.updateMatrixWorld();
      fog(scene, camera, target, 1.0, 2.0);

      readout.innerHTML = `<strong>RM${(CASH_MONTHLY[i] + (CASH_MONTHLY[i + 1] - CASH_MONTHLY[i]) * f).toFixed(2)}M</strong><span>${name(Math.round(m))}</span>`;
      placeLabel(readout, toStage(head.position.clone().add(new THREE.Vector3(0, 0.12, 0)), camera, w, h), clamp(draw * 20) * (1 - back));

      yearLabels.forEach((y) => placeLabel(y.el, toStage(new THREE.Vector3(y.x, 0, 1.25), camera, w, h), 0.9));
      beams.forEach((b) => {
        const on = clamp((m - b.i + 0.5) * 2);
        (b.beam.material as THREE.MeshBasicMaterial).opacity = 0.12 + 0.45 * on;
        placeLabel(b.el, toStage(new THREE.Vector3(X(b.i), 2.6, 0), camera, w, h), 0.4 + 0.6 * on);
      });
      lows.forEach((l) => {
        const on = clamp((m - l.i) * 2);
        l.s.scale.setScalar(Math.max(0.001, on));
        placeLabel(l.el, toStage(l.s.position.clone().add(new THREE.Vector3(0, -0.1, 0.1)), camera, w, h), on);
      });
    },
  };
}
