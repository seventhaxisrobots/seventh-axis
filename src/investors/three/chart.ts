// Financials: the UR10e builds the revenue chart. For each year it lifts a yellow
// year block off the conveyor and sets it on a plinth; that year's paying cells
// then stack up on it as crates, as tall as its recurring revenue. Scroll back up
// and it takes the chart apart again.

import * as THREE from "three";
import { PLAN } from "../../shared/business.ts";
import { ARM, solveIK, type Joints } from "../../robot/kinematics.ts";
import { RobotModel } from "../../robot/robot.ts";
import { clamp, ease, fog, frame, label, lights, placeLabel, shadowTexture, span, stageFloor, textTexture, toStage, type SceneSpec } from "./engine.ts";

type V3 = { x: number; y: number; z: number };
const PEDESTAL = 0.6;
const FLOOR = -PEDESTAL;
const PLINTH = -0.36; // plinth tops
const BLOCK = { w: 0.16, h: 0.11 };
const CRATE = 0.074;
const PER_CRATE = 0.4; // RM million of recurring revenue per crate
const BELT = { y: -0.2, z: -0.46, x0: 0.32, x1: 3.2, depth: 0.32 };
const PICK_X = 0.68;
const SPACING = 0.3;
// Plinths in a straight row in front of the robot, facing the camera.
const ROW = { z: 0.74, x0: -0.72, step: 0.36 };
const HOME: V3 = { x: 0.3, y: 0.05, z: 0.5 };
const lerp3 = (a: V3, b: V3, u: number): V3 => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, z: a.z + (b.z - a.z) * u });
const arc = (a: V3, b: V3, u: number, h: number): V3 => ({ ...lerp3(a, b, u), y: a.y + (b.y - a.y) * u + Math.sin(Math.PI * u) * h });

export function chartScene(stage: HTMLElement): SceneSpec {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
  lights(scene);

  const graphite = new THREE.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 0.55, metalness: 0.35 });
  const rail = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.4, metalness: 0.6 });
  stageFloor(scene, 6, FLOOR);

  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, PEDESTAL, 48), graphite);
  pedestal.position.y = -PEDESTAL / 2;
  scene.add(pedestal);
  const robot = new RobotModel();
  scene.add(robot.root);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.2), new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0, FLOOR + 0.002, 0.25);
  scene.add(shadow);

  // Conveyor behind the robot, running off to the right.
  const beltTex = (() => {
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 32;
    const g = c.getContext("2d")!;
    g.fillStyle = "#151515";
    g.fillRect(0, 0, 128, 32);
    g.fillStyle = "#2a2a2a";
    for (let x = 0; x < 128; x += 32) g.fillRect(x, 0, 6, 32);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.repeat.set((BELT.x1 - BELT.x0) / 0.25, 1);
    return t;
  })();
  const beltLen = BELT.x1 - BELT.x0, beltMid = (BELT.x0 + BELT.x1) / 2, bodyH = BELT.y - FLOOR - 0.03;
  const body = new THREE.Mesh(new THREE.BoxGeometry(beltLen, bodyH, BELT.depth), graphite);
  body.position.set(beltMid, FLOOR + bodyH / 2, BELT.z);
  scene.add(body);
  const top = new THREE.Mesh(new THREE.BoxGeometry(beltLen, 0.03, BELT.depth - 0.02), new THREE.MeshStandardMaterial({ map: beltTex, roughness: 0.85 }));
  top.position.set(beltMid, BELT.y - 0.015, BELT.z);
  scene.add(top);
  for (const side of [-1, 1]) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(beltLen + 0.04, 0.035, 0.022), rail);
    r.position.set(beltMid, BELT.y + 0.005, BELT.z + side * (BELT.depth / 2 + 0.005));
    scene.add(r);
  }

  const slots = PLAN.map((_, i) => ({ x: ROW.x0 + i * ROW.step, z: ROW.z }));
  const crateGeo = new THREE.BoxGeometry(CRATE * 0.94, CRATE * 0.94, CRATE * 0.94);
  const crateMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, metalness: 0.05 });
  const tmp = new THREE.Object3D();
  const shade = new THREE.Color();

  const columns = PLAN.map((y, i) => {
    const s = slots[i];
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.125, PLINTH - FLOOR, 40), graphite);
    plinth.position.set(s.x, (PLINTH + FLOOR) / 2, s.z);
    scene.add(plinth);

    const face = new THREE.MeshStandardMaterial({
      map: textTexture([{ text: String(y.year), font: "700 92px 'Inter Variable', sans-serif", color: "#0a0a0a", y: 70 }], 256, 140, "#a5b4ff"),
      roughness: 0.45,
    });
    const plain = new THREE.MeshStandardMaterial({ color: 0xa5b4ff, roughness: 0.45 });
    const block = new THREE.Mesh(new THREE.BoxGeometry(BLOCK.w, BLOCK.h, BLOCK.w), [face, face, plain, plain, face, face]);
    scene.add(block);

    const n = Math.max(1, Math.round(y.arr / PER_CRATE));
    const crates = new THREE.InstancedMesh(crateGeo, crateMat, n);
    for (let k = 0; k < n; k++) crates.setColorAt(k, shade.setHSL(0, 0, 0.72 + ((k * 37) % 11) / 60));
    crates.count = 0;
    scene.add(crates);

    const value = label(stage, `s3d-label--bar${i === PLAN.length - 1 ? " is-key" : ""}`, "");
    const foot = label(stage, "s3d-label--foot", `<strong>${y.year}</strong><span>${y.cells.toLocaleString("en-US")} cells</span>`);
    return { y, s, block, crates, n, value, foot };
  });

  let joints: Joints = solveIK({ ...HOME, yaw: 0 }) ?? [0, -1.2, 1.4, -1.8, -1.57, 0];
  const total = PLAN.length;
  const RUN = total + 0.5;
  const camDir = new THREE.Vector3(0.16, 0.36, 1);
  const target = new THREE.Vector3(0.18, 0.1, 0.35);

  return {
    scene,
    camera,
    update({ p, w, h }) {
      frame(camera, target, camDir, 1.15, 1.14, 1.04);
      camera.updateMatrixWorld();
      fog(scene, camera, target, 1.0, 2.2);
      const face = Math.atan2(camDir.x, camDir.z);

      const P = p * RUN;
      const k = Math.min(total, Math.floor(P));
      const t = P - k;
      const pickDown: V3 = { x: PICK_X, y: BELT.y + BLOCK.h - ARM.grip, z: BELT.z };
      const pickHover: V3 = { ...pickDown, y: pickDown.y + 0.16 };
      const placeDown = (i: number): V3 => ({ x: slots[i].x, y: PLINTH + BLOCK.h - ARM.grip, z: slots[i].z });
      const placeHover = (i: number): V3 => ({ ...placeDown(i), y: placeDown(i).y + 0.16 });

      let goal: V3;
      let holding = -1;
      let queue = k;
      if (k >= total) goal = lerp3(placeHover(total - 1), HOME, ease(clamp((P - total) / 0.5)));
      else {
        const from = k === 0 ? HOME : placeHover(k - 1);
        if (t < 0.18) goal = arc(from, pickHover, ease(span(0, 0.18, t)), 0.08);
        else if (t < 0.26) goal = lerp3(pickHover, pickDown, ease(span(0.18, 0.26, t)));
        else if (t < 0.3) goal = pickDown;
        else if (t < 0.38) goal = lerp3(pickDown, pickHover, ease(span(0.3, 0.38, t)));
        else if (t < 0.56) goal = arc(pickHover, placeHover(k), ease(span(0.38, 0.56, t)), 0.18);
        else if (t < 0.62) goal = lerp3(placeHover(k), placeDown(k), ease(span(0.56, 0.62, t)));
        else if (t < 0.66) goal = placeDown(k);
        else goal = lerp3(placeDown(k), placeHover(k), ease(span(0.66, 0.74, t)));
        if (t >= 0.28 && t < 0.64) holding = k;
        queue = k + ease(span(0.32, 0.56, t));
      }
      const q = solveIK({ ...goal, yaw: 0 });
      if (q) joints = q;
      robot.setJoints(joints);
      robot.setGripper(holding >= 0 ? BLOCK.w : BLOCK.w + 0.06);
      beltTex.offset.x = (queue * SPACING) / 0.25;

      columns.forEach((c, i) => {
        const placed = i < k || (i === k && t >= 0.64);
        const b = c.block;
        b.rotation.y = face;
        if (placed) b.position.set(c.s.x, PLINTH + BLOCK.h / 2, c.s.z);
        else if (i === holding) b.position.set(goal.x, goal.y + ARM.grip - BLOCK.h / 2, goal.z);
        else b.position.set(PICK_X + (i - queue) * SPACING, BELT.y + BLOCK.h / 2, BELT.z);
        b.visible = PICK_X + (i - queue) * SPACING < BELT.x1 - 0.1 || placed || i === holding;

        // Crates: this year's cells, stacking 2 × 2 on the block once it's down.
        const grow = i < k ? 1 : i === k ? span(0.64, 0.98, t) : 0;
        const shown = grow * c.n;
        c.crates.count = Math.min(c.n, Math.ceil(shown));
        for (let j = 0; j < c.crates.count; j++) {
          const u = ease(clamp(shown - j));
          const layer = Math.floor(j / 4), cell = j % 4;
          const ox = (cell % 2 ? 0.5 : -0.5) * CRATE, oz = (cell < 2 ? 0.5 : -0.5) * CRATE;
          tmp.position.set(ox, PLINTH + BLOCK.h + CRATE / 2 + layer * CRATE + (1 - u) * 0.18, oz);
          tmp.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), face).add(new THREE.Vector3(c.s.x, 0, c.s.z));
          tmp.rotation.set(0, face, 0);
          tmp.scale.setScalar(Math.max(0.001, u));
          tmp.updateMatrix();
          c.crates.setMatrixAt(j, tmp.matrix);
        }
        c.crates.instanceMatrix.needsUpdate = true;

        const topY = PLINTH + BLOCK.h + Math.ceil(shown / 4) * CRATE;
        c.value.innerHTML = `RM${(c.y.arr * grow).toFixed(1)}M`;
        placeLabel(c.value, toStage(new THREE.Vector3(c.s.x, Math.max(topY, PLINTH + BLOCK.h) + 0.04, c.s.z), camera, w, h), clamp(grow * 3));
        placeLabel(c.foot, toStage(new THREE.Vector3(c.s.x, FLOOR, c.s.z + 0.14), camera, w, h), placed ? 1 : 0.35);
      });
    },
  };
}
