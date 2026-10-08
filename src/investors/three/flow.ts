// Product: a plan, typed in Bahasa Malaysia, travels through four gates. It is
// checked by a scanning plane, stamped with a signature seal, handed to the
// controller, and only then does the UR10e run the job.

import * as THREE from "three";
import { ARM, heldCentreY, solveIK, type Joints } from "../../robot/kinematics.ts";
import { RobotModel } from "../../robot/robot.ts";
import { clamp, ease, fog, frame, label, lights, placeLabel, shadowTexture, span, stageFloor, textTexture, toStage, type SceneSpec } from "./engine.ts";

type V3 = { x: number; y: number; z: number };
const GATES = [-1.8, -0.6, 0.6, 1.8];
const GATE = 0.9;
const CARD_Y = 0.48;
const ROBOT = new THREE.Vector3(3.05, 0.5, -0.25);
const lerp3 = (a: V3, b: V3, u: number): V3 => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, z: a.z + (b.z - a.z) * u });
const arc = (a: V3, b: V3, u: number, h: number): V3 => ({ ...lerp3(a, b, u), y: a.y + (b.y - a.y) * u + Math.sin(Math.PI * u) * h });

export function flowScene(stage: HTMLElement): SceneSpec {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 60);
  lights(scene);

  const graphite = new THREE.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 0.6, metalness: 0.4 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.35, metalness: 0.8 });
  stageFloor(scene, 12);

  // Gates: square frames the plan passes through, glowing once it has.
  const gates = GATES.map((x) => {
    const glow = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, emissive: 0xffcd11, emissiveIntensity: 0, roughness: 0.4, metalness: 0.5 });
    const g = new THREE.Group();
    const t = 0.05;
    const bar = (w: number, h: number, y: number, z: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(t, h, w), glow);
      m.position.set(0, y, z);
      g.add(m);
    };
    bar(t, GATE, GATE / 2, -GATE / 2);
    bar(t, GATE, GATE / 2, GATE / 2);
    bar(GATE + t, t, GATE, 0);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.02, GATE + 0.2), graphite);
    foot.position.y = 0.01;
    g.add(foot);
    g.position.x = x;
    scene.add(g);
    return glow;
  });

  // The plan card, with the operator's words on its face.
  const face = textTexture(
    [
      { text: "Susun 12 kotak", font: "600 64px 'Barlow Semi Condensed', sans-serif", color: "#0a0a0a", y: 86 },
      { text: "di palet 2", font: "600 64px 'Barlow Semi Condensed', sans-serif", color: "#0a0a0a", y: 156 },
      { text: "Stack 12 boxes on pallet 2", font: "400 30px Barlow, sans-serif", color: "#5c5c5c", y: 228 },
    ],
    512,
    320,
    "#ffffff",
  );
  const cardMats = [graphite, graphite, graphite, graphite, new THREE.MeshStandardMaterial({ map: face, roughness: 0.5 }), graphite];
  const card = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.41, 0.02), cardMats);
  scene.add(card);

  // Check: a translucent yellow plane that sweeps the plan.
  const scan = new THREE.Mesh(
    new THREE.BoxGeometry(0.012, 0.5, 0.5),
    new THREE.MeshBasicMaterial({ color: 0xffcd11, transparent: true, opacity: 0.45, depthWrite: false }),
  );
  scene.add(scan);

  // Approve: a seal that drops onto the plan and stays.
  const seal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 0.016, 40),
    new THREE.MeshStandardMaterial({ color: 0xffcd11, roughness: 0.3, metalness: 0.4, emissive: 0xffcd11, emissiveIntensity: 0.15 }),
  );
  seal.rotation.x = Math.PI / 2;
  scene.add(seal);

  // Run: the controller cabinet and the robot.
  const cabinet = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.5, 0.26), graphite);
  cabinet.position.set(2.45, 0.25, -0.55);
  scene.add(cabinet);
  const lamp = new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0x41d67c, emissiveIntensity: 0 });
  const light = new THREE.Mesh(new THREE.SphereGeometry(0.025, 16, 12), lamp);
  light.position.set(2.45, 0.42, -0.415);
  scene.add(light);

  const robotRoot = new THREE.Group();
  robotRoot.position.copy(ROBOT);
  scene.add(robotRoot);
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, ROBOT.y, 40), graphite);
  pedestal.position.y = -ROBOT.y / 2;
  robotRoot.add(pedestal);
  const robot = new RobotModel();
  robotRoot.add(robot.root);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.2), new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(ROBOT.x, 0.003, ROBOT.z + 0.2);
  scene.add(shadow);

  // Two stands and a carton the robot moves (in the robot's own frame: base at the origin).
  const STAND_Y = -0.22;
  const PICK: V3 = { x: -0.45, y: STAND_Y, z: 0.55 };
  const PLACE: V3 = { x: 0.45, y: STAND_Y, z: 0.6 };
  for (const s of [PICK, PLACE]) {
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.26, ROBOT.y + STAND_Y, 0.26), steel);
    stand.position.set(s.x, (STAND_Y - ROBOT.y) / 2, s.z);
    robotRoot.add(stand);
  }
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.14), new THREE.MeshStandardMaterial({ color: 0xc9a46e, roughness: 0.8 }));
  robotRoot.add(box);
  const HOME: V3 = { x: 0, y: 0.25, z: 0.55 };
  let joints: Joints = solveIK({ ...HOME, yaw: 0 }) ?? [0, -1.2, 1.4, -1.8, -1.57, 0];

  const names = ["Ask", "Check", "Approve", "Run"].map((n, i) => label(stage, "s3d-label--gate", `<span>0${i + 1}</span>${n}`));
  const status = label(stage, "s3d-label--status", "");
  const steps = [...(stage.closest("section") ?? stage).querySelectorAll<HTMLElement>("[data-step]")];

  const at = (x: number, y = 0, z = 0) => new THREE.Vector3(x, y, z);

  return {
    scene,
    camera,
    update({ p, time, w, h }) {
      const wide = w / h > 1.05;
      // Where the plan is along the line, with pauses at each gate.
      const move = (a: number, b: number) => ease(span(a, b, p));
      // The plan waits just past each gate, clear of its posts.
      const AFTER = 0.5;
      let x = GATES[0] + AFTER * move(0.02, 0.1);
      x += (GATES[1] - GATES[0]) * move(0.12, 0.24);
      x += (GATES[2] - GATES[1]) * move(0.4, 0.52);
      x += (GATES[3] - GATES[2]) * move(0.64, 0.74);
      x += (2.45 - GATES[3] - AFTER) * move(0.78, 0.84);
      const form = ease(span(0.0, 0.1, p));
      const intoCabinet = move(0.8, 0.86);
      card.position.set(x, CARD_Y + Math.sin(time * 1.6) * 0.012 - intoCabinet * 0.1, -0.55 * intoCabinet);
      card.scale.setScalar(Math.max(0.001, form * (1 - intoCabinet)));
      card.rotation.y = Math.sin(time * 0.8) * 0.06;

      const sweep = span(0.25, 0.38, p);
      scan.visible = sweep > 0 && sweep < 1;
      scan.position.set(card.position.x - 0.38 + 0.76 * ((sweep * 2) % 1), CARD_Y, card.position.z);

      const drop = ease(span(0.54, 0.6, p));
      seal.visible = p > 0.53 && intoCabinet < 1;
      seal.position.set(card.position.x + 0.24 * card.scale.x, card.position.y - 0.08 + (1 - drop) * 0.6, card.position.z + 0.02);
      seal.scale.setScalar(card.scale.x || 0.001);

      const passed = [0.06, 0.36, 0.6, 0.86];
      gates.forEach((g, i) => (g.emissiveIntensity = 0.9 * clamp((p - passed[i]) / 0.05)));
      lamp.emissiveIntensity = 2 * clamp((p - 0.86) / 0.03);

      // The robot runs the job once the controller has the signed plan.
      const run = span(0.86, 1, p);
      const pickHover = { ...PICK, y: PICK.y + 0.28 };
      const pickDown = { ...PICK, y: PICK.y + 0.12 - ARM.grip };
      const placeHover = { ...PLACE, y: PLACE.y + 0.28 };
      const placeDown = { ...PLACE, y: PLACE.y + 0.12 - ARM.grip };
      let goal: V3 = HOME;
      let held = false;
      if (run > 0) {
        if (run < 0.25) goal = arc(HOME, pickHover, ease(span(0, 0.25, run)), 0.05);
        else if (run < 0.35) goal = lerp3(pickHover, pickDown, ease(span(0.25, 0.35, run)));
        else if (run < 0.45) goal = lerp3(pickDown, pickHover, ease(span(0.38, 0.45, run)));
        else if (run < 0.75) goal = arc(pickHover, placeHover, ease(span(0.45, 0.75, run)), 0.12);
        else if (run < 0.85) goal = lerp3(placeHover, placeDown, ease(span(0.75, 0.85, run)));
        else goal = lerp3(placeDown, placeHover, ease(span(0.88, 1, run)));
        held = run > 0.36 && run < 0.86;
      }
      const q = solveIK({ ...goal, yaw: 0 });
      if (q) joints = q;
      robot.setJoints(joints);
      robot.setGripper(held ? 0.14 : 0.2);
      const rest = run >= 0.86 ? PLACE : PICK;
      if (held) box.position.set(goal.x, heldCentreY(goal.y, 0.12), goal.z);
      else box.position.set(rest.x, rest.y + 0.06, rest.z);

      // Camera: the whole line on wide screens; following the plan on tall ones.
      const follow = wide ? 0.65 : THREE.MathUtils.clamp(x, -1.8, 2.9);
      const look = at(follow, 0.42, 0);
      frame(camera, look, at(0.2, 0.36, 1), wide ? 3.2 : 1.3, 0.98, 1.06);
      fog(scene, camera, look, 0.95, 1.7);

      names.forEach((el, i) => placeLabel(el, toStage(at(GATES[i], 0, 0.6), camera, w, h), 0.35 + 0.65 * clamp((p - passed[i] + 0.04) / 0.05)));
      const words =
        p < 0.12 ? "Plan written from the operator's words" :
        p < 0.4 ? (sweep > 0.98 ? "Reach ✓ Collisions ✓ Payload ✓ Speed ✓" : "Checking reach, collisions, payload, speed") :
        p < 0.64 ? (drop >= 1 ? "Signed by the supervisor, for this program only" : "Waiting for a named person to approve") :
        p < 0.86 ? "Bridge verifies the signature" : "Running on the UR10e";
      status.textContent = words;
      placeLabel(status, toStage(at(Math.min(card.position.x, 2.45), CARD_Y + 0.42, card.position.z), camera, w, h), form);
      const step = p < 0.24 ? 0 : p < 0.52 ? 1 : p < 0.8 ? 2 : 3;
      steps.forEach((el) => el.classList.toggle("is-on", Number(el.dataset.step) === step));
    },
  };
}
