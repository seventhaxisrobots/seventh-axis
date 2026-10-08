// The cobot builds the headline, in 3D: a UR10e (the Studio's own model and joint
// solver) lifts word tiles off a conveyor and sets them into "Robots should
// understand the people who run them." Scroll position drives every pose, so
// scrolling back up un-builds the line.
//
// The words are HTML, typeset in screen space. Each word's spot is projected into
// the arm's 3D space (the camera is orthographic, so the mapping is exact) and the
// gripper is solved to it, so the tool really is where the word goes.

import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { solveIK, type Joints } from "../robot/kinematics.ts";
import { RobotModel } from "../robot/robot.ts";

type V3 = { x: number; y: number; z: number };

const WORDS = ["Robots", "should", "understand", "the", "people", "who", "run", "them."];
const BUILD = WORDS.length + 0.6; // one unit per word, then back home
const SMALL = 0.42; // a word as a tile on the belt, relative to its headline size
const PEDESTAL = 0.6;
const BELT = { y: -0.12, z: 0.5, x0: 0.42, x1: 3.2, depth: 0.36 };
const PICK_X = 0.62;
const SPACING = 0.34; // metres between tiles on the belt
const HEAD_Z = 0.28; // the headline's plane, a little in front of the robot
// Resting pose: stretched out low along the belt, so the elbow stays below the finished headline.
const HOME: V3 = { x: 1.05, y: -0.02, z: 0.5 };
const OPEN = 0.1;
const HOLD = 0.035;
const AZIMUTH = -0.32; // camera turned a little to the robot's right
const ELEVATION = 0.16;

const clamp = (v: number) => Math.max(0, Math.min(1, v));
const ease = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const span = (a: number, b: number, x: number) => clamp((x - a) / (b - a));
const lerp = (a: V3, b: V3, u: number): V3 => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, z: a.z + (b.z - a.z) * u });
const arc = (a: V3, b: V3, u: number, h: number): V3 => ({ ...lerp(a, b, u), y: a.y + (b.y - a.y) * u + Math.sin(Math.PI * u) * h });
const mix = (a: number[], b: number[], u: number) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * u)).join(",")})`;
const INK_BROWN = [59, 42, 23];
const PAPER = [255, 255, 255];

interface Layout {
  font: number;
  /** Word box height in metres at headline size. */
  tile: number;
  /** Each word's headline box: top centre in 3D, centre on screen. */
  tops: V3[];
  centres: { x: number; y: number }[];
}

export function startCobot(section: HTMLElement, stage: HTMLElement, words: HTMLElement[], still: boolean): void {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.domElement.className = "cobot__canvas";
  stage.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  scene.add(new THREE.HemisphereLight(0xeeeeee, 0x0a0a0a, 0.7));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(2, 4, 3);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffcd11, 0.6);
  rim.position.set(-3, 2, -2);
  scene.add(rim);

  // Robot on its pedestal (the robot base is the origin; y up, +z towards the viewer).
  const world = new THREE.Group();
  scene.add(world);
  const graphite = new THREE.MeshStandardMaterial({ color: 0x1c222b, roughness: 0.55, metalness: 0.35 });
  const rail = new THREE.MeshStandardMaterial({ color: 0x3a4350, roughness: 0.4, metalness: 0.6 });
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, PEDESTAL, 48), graphite);
  pedestal.position.y = -PEDESTAL / 2;
  world.add(pedestal);
  const robot = new RobotModel();
  world.add(robot.root);

  // A soft contact shadow on the floor under everything.
  const shadowTex = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d")!;
    const grad = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    grad.addColorStop(0, "rgba(0,0,0,0.55)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.2), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0.2, -PEDESTAL + 0.002, 0.2);
  world.add(shadow);

  // Conveyor running off to the right.
  const beltTex = (() => {
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 32;
    const g = c.getContext("2d")!;
    g.fillStyle = "#151515";
    g.fillRect(0, 0, 128, 32);
    g.fillStyle = "#28303b";
    for (let x = 0; x < 128; x += 32) g.fillRect(x, 0, 6, 32);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.repeat.set((BELT.x1 - BELT.x0) / 0.25, 1);
    return t;
  })();
  const beltLen = BELT.x1 - BELT.x0;
  const beltMid = (BELT.x0 + BELT.x1) / 2;
  const bodyH = BELT.y + PEDESTAL - 0.03;
  const body = new THREE.Mesh(new THREE.BoxGeometry(beltLen, bodyH, BELT.depth), graphite);
  body.position.set(beltMid, -PEDESTAL + bodyH / 2, BELT.z);
  world.add(body);
  const top = new THREE.Mesh(new THREE.BoxGeometry(beltLen, 0.03, BELT.depth - 0.02), new THREE.MeshStandardMaterial({ map: beltTex, roughness: 0.85 }));
  top.position.set(beltMid, BELT.y - 0.015, BELT.z);
  world.add(top);
  for (const side of [-1, 1]) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(beltLen + 0.04, 0.04, 0.025), rail);
    r.position.set(beltMid, BELT.y + 0.005, BELT.z + side * (BELT.depth / 2 + 0.005));
    world.add(r);
  }
  const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, BELT.depth, 24), rail);
  roller.rotation.x = Math.PI / 2;
  roller.position.set(BELT.x0, BELT.y - 0.03, BELT.z);
  world.add(roller);

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 40);
  const raycaster = new THREE.Raycaster();
  const headPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -HEAD_Z);
  let W = 1;
  let H = 1;
  let layout: Layout | null = null;

  const toScreen = (p: V3) => {
    const v = new THREE.Vector3(p.x, p.y, p.z).project(camera);
    return { x: ((v.x + 1) / 2) * W, y: ((1 - v.y) / 2) * H };
  };
  const toHeadPlane = (sx: number, sy: number): V3 => {
    raycaster.setFromCamera(new THREE.Vector2((sx / W) * 2 - 1, 1 - (sy / H) * 2), camera);
    const hit = new THREE.Vector3();
    raycaster.ray.intersectPlane(headPlane, hit);
    return { x: hit.x, y: hit.y, z: hit.z };
  };

  const measure = (font: number) => {
    const c = document.createElement("canvas").getContext("2d")!;
    c.font = `600 ${font}px 'Barlow Semi Condensed', sans-serif`;
    return WORDS.map((w) => c.measureText(w).width + font * 0.34);
  };

  /** Camera and headline for this viewport. Shrinks the type until every word is within the arm's reach. */
  function fit(): void {
    W = Math.max(1, stage.clientWidth);
    H = Math.max(1, stage.clientHeight);
    renderer.setSize(W, H, false);
    const wide = W / H >= 1;
    const lines = wide ? [[0, 1, 2], [3, 4, 5, 6, 7]] : [[0, 1], [2], [3, 4, 5], [6, 7]];
    // Pixels per metre, and where the robot base sits on screen.
    const ppm = wide ? Math.min(H / 2.05, W / 3.1) : Math.min(H / 1.95, W / 1.3);
    const baseX = wide ? W * 0.47 : W * 0.38;
    const baseY = wide ? H * 0.7 : H * 0.72;
    const dir = new THREE.Vector3(Math.sin(AZIMUTH) * Math.cos(ELEVATION), Math.sin(ELEVATION), Math.cos(AZIMUTH) * Math.cos(ELEVATION));
    camera.position.copy(dir.multiplyScalar(10));
    camera.up.set(0, 1, 0);
    camera.lookAt(0, 0, 0);
    // The frustum is placed so the base (the origin, where the camera looks) lands at (baseX, baseY).
    camera.left = -baseX / ppm;
    camera.right = (W - baseX) / ppm;
    camera.top = baseY / ppm;
    camera.bottom = -(H - baseY) / ppm;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();

    let font = wide ? Math.min(92, Math.max(34, W * 0.056)) : Math.min(54, Math.max(26, W * 0.115));
    for (let attempt = 0; attempt < 12; attempt++, font *= 0.92) {
      const widths = measure(font);
      const boxH = font * 1.18;
      const gap = boxH * 0.08;
      // The headline's top sits at a fixed height in the arm's space.
      const topScreen = toScreen({ x: 0.05, y: wide ? 0.84 : 0.98, z: HEAD_Z });
      const centres: { x: number; y: number }[] = [];
      lines.forEach((line, row) => {
        const total = line.reduce((s, i) => s + widths[i], 0) + gap * (line.length - 1);
        let x = topScreen.x - total / 2;
        const y = topScreen.y + boxH / 2 + row * (boxH + gap);
        for (const i of line) {
          centres[i] = { x: x + widths[i] / 2, y };
          x += widths[i] + gap;
        }
      });
      const tops = centres.map((c) => toHeadPlane(c.x, c.y - boxH / 2));
      const widest = Math.max(...lines.map((l) => l.reduce((s, i) => s + widths[i], 0)));
      const fits = widest < W * 0.94 && tops.every((t) => solveIK({ ...t, y: t.y + 0.08, yaw: 0 }) && solveIK({ ...t, yaw: 0 }));
      layout = { font, tile: boxH / ppm, tops, centres };
      if (fits) break;
    }
    stage.style.setProperty("--cobot-font", `${layout!.font}px`);
  }

  let lastJoints: Joints = solveIK({ ...HOME, yaw: 0 })!;

  function draw(P: number): void {
    if (!layout) return;
    const { tile, tops, centres } = layout;
    const n = WORDS.length;
    const small = tile * SMALL;
    const pickDown: V3 = { x: PICK_X, y: BELT.y + small, z: BELT.z };
    const pickHover: V3 = { ...pickDown, y: pickDown.y + 0.14 };
    const placeHover = (i: number): V3 => ({ ...tops[i], y: tops[i].y + 0.08 });

    const k = Math.min(n, Math.floor(P));
    const t = P - k;
    let goal: V3;
    let holding = false;
    let queue = k;
    if (k >= n) {
      goal = lerp(placeHover(n - 1), HOME, ease(clamp((P - n) / 0.6)));
    } else {
      const from = k === 0 ? HOME : placeHover(k - 1);
      if (t < 0.22) goal = arc(from, pickHover, ease(span(0, 0.22, t)), 0.1);
      else if (t < 0.32) goal = lerp(pickHover, pickDown, ease(span(0.22, 0.32, t)));
      else if (t < 0.4) goal = pickDown;
      else if (t < 0.5) goal = lerp(pickDown, pickHover, ease(span(0.4, 0.5, t)));
      else if (t < 0.78) goal = arc(pickHover, placeHover(k), ease(span(0.5, 0.78, t)), 0.14);
      else if (t < 0.88) goal = lerp(placeHover(k), tops[k], ease(span(0.78, 0.88, t)));
      else if (t < 0.94) goal = tops[k];
      else goal = lerp(tops[k], placeHover(k), ease(span(0.94, 1, t)));
      holding = t >= 0.34 && t < 0.9;
      // The belt brings the next word up once this one has been lifted.
      queue = k + ease(span(0.42, 0.78, t));
    }
    const q = solveIK({ ...goal, yaw: 0 });
    if (q) lastJoints = q;
    robot.setJoints(lastJoints);
    robot.setGripper(holding ? HOLD : OPEN);

    words.forEach((el, i) => {
      let at: { x: number; y: number };
      let sc: number;
      let card: number;
      if (i < k || (i === k && t >= 0.9)) {
        at = centres[i];
        sc = 1;
        card = 0;
      } else if (i === k && t >= 0.4) {
        sc = SMALL + (1 - SMALL) * ease(span(0.5, 0.78, t));
        card = 1 - span(0.6, 0.86, t);
        // The tile hangs from the gripper: its top is at the tool.
        at = toScreen({ x: goal.x, y: goal.y - (tile * sc) / 2, z: goal.z });
      } else {
        sc = SMALL;
        card = 1;
        at = toScreen({ x: PICK_X + (i - queue) * SPACING, y: BELT.y + small / 2, z: BELT.z });
      }
      el.style.transform = `translate(${at.x.toFixed(1)}px, ${at.y.toFixed(1)}px) translate(-50%, -50%) scale(${sc.toFixed(3)})`;
      el.style.background = `rgba(201, 164, 110, ${card.toFixed(3)})`;
      el.style.color = mix(INK_BROWN, PAPER, 1 - card);
      el.style.boxShadow = `0 ${(10 * card).toFixed(1)}px ${(20 * card).toFixed(1)}px rgba(0, 0, 0, ${(0.4 * card).toFixed(3)})`;
    });
    beltTex.offset.x = (queue * SPACING) / 0.25;
    renderer.render(scene, camera);
  }

  // Scroll drives the pose; ease towards it so wheel steps don't jerk the arm.
  let shown = still ? BUILD : 0;
  let target = shown;
  let running = false;
  const progress = () => {
    const r = section.getBoundingClientRect();
    const run = r.height - window.innerHeight;
    return run > 0 ? clamp(-r.top / run) * BUILD : BUILD;
  };
  const tick = () => {
    shown += (target - shown) * 0.16;
    if (Math.abs(target - shown) < 0.0005) shown = target;
    draw(shown);
    if (shown !== target) requestAnimationFrame(tick);
    else running = false;
  };
  const onScroll = () => {
    if (still) return;
    target = progress();
    if (!running) {
      running = true;
      requestAnimationFrame(tick);
    }
  };

  const refit = () => {
    fit();
    draw(shown);
  };
  refit();
  document.fonts?.load(`600 64px 'Barlow Semi Condensed'`).then(refit).catch(() => undefined);
  void robot.ready.then(() => draw(shown));
  new ResizeObserver(refit).observe(stage);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  section.classList.add("cobot--ready");
}
