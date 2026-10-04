// Market: each layer of the market is a glass slab whose area is its yearly value,
// dotted with one point per 100 robots. They drop in one by one as you scroll,
// the largest at the bottom, with our 2031 share as a solid yellow slab on top.

import * as THREE from "three";
import { MARKET } from "../../shared/business.ts";
import { clamp, ease, fog, frame, label, stageFloor, lights, placeLabel, span, toStage, type SceneSpec } from "./engine.ts";

const THICK = 0.07;
const STEP = 0.42;
const K = 2.2 / Math.sqrt(Math.max(...MARKET.map((m) => m.value)));

export function marketScene(stage: HTMLElement, light: boolean): SceneSpec {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
  lights(scene);

  stageFloor(scene, 7, -0.06);

  // Stack order: largest at the bottom. Arrival order: as the story is told (the data's order).
  const bySize = [...MARKET].sort((a, b) => b.value - a.value);
  const ours = MARKET.at(-1)!;
  const slabs = MARKET.map((m, order) => {
    const side = K * Math.sqrt(m.value);
    const y = bySize.indexOf(m) * STEP;
    const key = m === ours;
    const g = new THREE.Group();
    const mat = key
      ? new THREE.MeshStandardMaterial({ color: 0xffcd11, roughness: 0.35, metalness: 0.1, emissive: 0xffcd11, emissiveIntensity: 0.12, transparent: true })
      : new THREE.MeshStandardMaterial({ color: 0xdfe6ee, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.16, depthWrite: false });
    const slab = new THREE.Mesh(new THREE.BoxGeometry(side, THICK, side), mat);
    g.add(slab);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(slab.geometry), new THREE.LineBasicMaterial({ color: key ? 0x0a0a0a : 0xffffff, transparent: true, opacity: 0.75 }));
    g.add(edges);

    // One dot per 100 robots, on a jittered grid over the top face.
    const n = Math.max(1, Math.round(m.robots / (light ? 200 : 100)));
    const cols = Math.ceil(Math.sqrt(n));
    const pts: number[] = [];
    let s = 11 + order;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647 - 0.5);
    for (let i = 0; i < n; i++) {
      const cx = ((i % cols) + 0.5) / cols - 0.5, cz = (Math.floor(i / cols) + 0.5) / cols - 0.5;
      pts.push((cx + rnd() * 0.6 / cols) * side * 0.9, THICK / 2 + 0.006, (cz + rnd() * 0.6 / cols) * side * 0.9);
    }
    const dotsGeo = new THREE.BufferGeometry();
    dotsGeo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    const dotMat = new THREE.PointsMaterial({ color: key ? 0x0a0a0a : 0xffffff, size: key ? 0.035 : 0.022, transparent: true, depthWrite: false });
    g.add(new THREE.Points(dotsGeo, dotMat));
    scene.add(g);

    const el = label(stage, `s3d-label--slab${key ? " is-key" : ""}`, `<strong>RM${m.value}M</strong><span>${m.layer}</span><small>${m.robots.toLocaleString("en-US")} ${key ? "cells" : "robots"}</small>`);
    const from = 0.04 + order * 0.17;
    return { m, g, y, side, mat, edges: edges.material as THREE.LineBasicMaterial, dotMat, el, from, key };
  });

  const right = new THREE.Vector3();
  const target = new THREE.Vector3(0, 0.8, 0);
  const dir = new THREE.Vector3();

  return {
    scene,
    camera,
    update({ p, time, w, h }) {
      const wide = w / h > 1.05;
      const az = 0.7 + p * 0.9 + time * 0.02;
      dir.set(Math.sin(az), wide ? 0.62 : 0.34, Math.cos(az));
      frame(camera, target, dir, 2.05, 1.15, 1.04);
      // Sit the stack a little left of centre in its box, so its labels fit on the right.
      right.setFromMatrixColumn(camera.matrixWorld, 0);
      camera.position.addScaledVector(right, camera.aspect < 1 ? 0.95 : 0.5);
      camera.updateMatrixWorld();
      fog(scene, camera, target, 1.0, 2.0);
      right.setFromMatrixColumn(camera.matrixWorld, 0).setY(0).normalize();

      for (const s of slabs) {
        const u = ease(span(s.from, s.from + 0.13, p));
        s.g.position.y = s.y + (1 - u) * 1.4;
        s.g.rotation.y = (1 - u) * 0.6;
        const a = clamp(u * 1.4);
        if (s.key) s.mat.opacity = a;
        else s.mat.opacity = 0.16 * a;
        s.edges.opacity = 0.75 * a;
        s.dotMat.opacity = 0.9 * clamp((u - 0.6) / 0.4);
        s.g.visible = u > 0.001;
        const anchor = new THREE.Vector3(0, s.g.position.y, 0).addScaledVector(right, (s.side / 2) * 1.414 * 0.98);
        placeLabel(s.el, toStage(anchor, camera, w, h), clamp((u - 0.7) / 0.3));
      }
    },
  };
}
