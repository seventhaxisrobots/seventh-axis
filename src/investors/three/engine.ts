// One WebGL canvas for every 3D scene on /investors. The canvas is fixed over the
// viewport; each scene draws only inside its own sticky stage (viewport + scissor),
// so six scenes share one GPU context and the white sections stay untouched.
// Each stage's copy and the 3D sit in separate grid areas, so they never overlap.
//
// Scroll drives each scene: progress runs 0 → 1 while its section scrolls past,
// eased so wheel steps don't jerk. Scrolling back up rewinds.

import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

export interface Frame {
  /** Scroll progress through the section, eased, 0 → 1. */
  p: number;
  /** Seconds since the engine started, for idle motion. */
  time: number;
  /** Stage size in CSS pixels. */
  w: number;
  h: number;
}

export interface SceneSpec {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  /** Pose everything for this frame (objects and HTML labels). */
  update(f: Frame): void;
}

interface Entry extends SceneSpec {
  section: HTMLElement;
  stage: HTMLElement;
  shown: number;
  target: number;
  visible: boolean;
}

const clamp = (v: number) => Math.max(0, Math.min(1, v));

export class Engine {
  readonly renderer: THREE.WebGLRenderer;
  readonly env: THREE.Texture;
  readonly light: boolean;
  private readonly entries: Entry[] = [];
  private readonly clock = new THREE.Clock();
  private running = false;

  constructor(readonly still: boolean) {
    // Phones and low-core machines get a lighter render.
    this.light = innerWidth < 760 || (navigator.hardwareConcurrency ?? 8) <= 4;
    this.renderer = new THREE.WebGLRenderer({ antialias: !this.light, alpha: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, this.light ? 1.25 : 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.autoClear = false;
    const canvas = this.renderer.domElement;
    canvas.className = "s3d-canvas";
    canvas.setAttribute("aria-hidden", "true");
    document.body.append(canvas);
    this.env = new THREE.PMREMGenerator(this.renderer).fromScene(new RoomEnvironment(), 0.04).texture;

    const resize = () => this.renderer.setSize(innerWidth, innerHeight, false);
    resize();
    addEventListener("resize", () => {
      resize();
      this.wake();
    });
    addEventListener("scroll", () => this.wake(), { passive: true });
  }

  add(section: HTMLElement, spec: SceneSpec): void {
    // The scene draws only inside its view box, which the layout keeps clear of the copy.
    const stage = section.querySelector<HTMLElement>("[data-view]") ?? section;
    spec.scene.environment = this.env;
    const entry: Entry = { ...spec, section, stage, shown: this.still ? 1 : 0, target: this.still ? 1 : 0, visible: false };
    entry.shown = entry.target = this.progress(entry);
    this.entries.push(entry);
    section.classList.add("s3d--ready");
    this.wake();
  }

  private progress(e: Entry): number {
    if (this.still) return 1;
    const r = e.section.getBoundingClientRect();
    const run = r.height - innerHeight;
    return run > 0 ? clamp(-r.top / run) : 1;
  }

  private wake(): void {
    if (this.running) return;
    this.running = true;
    requestAnimationFrame(this.tick);
  }

  private readonly tick = () => {
    const time = this.clock.getElapsedTime();
    const r = this.renderer;
    const H = innerHeight;
    r.setScissorTest(false);
    r.clear();
    r.setScissorTest(true);
    let any = false;
    for (const e of this.entries) {
      const rect = e.stage.getBoundingClientRect();
      e.visible = rect.bottom > 0 && rect.top < H && rect.width > 0;
      if (!e.visible) continue;
      any = true;
      e.target = this.progress(e);
      e.shown += (e.target - e.shown) * 0.12;
      if (Math.abs(e.target - e.shown) < 0.0004) e.shown = e.target;
      const w = rect.width, h = rect.height;
      if (e.camera.aspect !== w / h) {
        e.camera.aspect = w / h;
        e.camera.updateProjectionMatrix();
      }
      e.update({ p: e.shown, time, w, h });
      const top = Math.max(0, rect.top), bottom = Math.min(H, rect.bottom);
      r.setViewport(rect.left, H - rect.bottom, w, h);
      r.setScissor(rect.left, H - bottom, w, bottom - top);
      r.render(e.scene, e.camera);
    }
    // Keep going while any scene is on screen (idle motion); otherwise sleep until a scroll.
    if (any && !document.hidden) requestAnimationFrame(this.tick);
    else this.running = false;
  };
}

/** Standard studio lighting for the dark stages. */
export function lights(scene: THREE.Scene, rim = 0xf26a1b): void {
  scene.add(new THREE.HemisphereLight(0xeeeeee, 0x0a0a0a, 0.6));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(2, 4, 3);
  scene.add(key);
  const back = new THREE.DirectionalLight(rim, 0.7);
  back.position.set(-3, 2, -2);
  scene.add(back);
}

/** Fade the far floor into the stage's black, scaled to the camera's distance from what it frames. */
export function fog(scene: THREE.Scene, camera: THREE.Camera, target: THREE.Vector3, near = 0.9, far = 1.8): void {
  const d = camera.position.distanceTo(target);
  if (!(scene.fog instanceof THREE.Fog)) scene.fog = new THREE.Fog(0x0b0b0b, 1, 2);
  scene.fog.near = d * near;
  scene.fog.far = d * far;
}

/** A dark floor with a faint grid, for the stages. */
export function stageFloor(scene: THREE.Scene, size: number, y = 0, grid = true): void {
  const c = document.createElement("canvas");
  c.width = c.height = 1024;
  const g = c.getContext("2d")!;
  if (grid) {
    const cells = size * 4;
    g.strokeStyle = "rgba(255,255,255,0.09)";
    g.lineWidth = 1.5;
    for (let i = 0; i <= cells; i++) {
      const t = (i / cells) * 1024;
      g.beginPath();
      g.moveTo(t, 0);
      g.lineTo(t, 1024);
      g.moveTo(0, t);
      g.lineTo(1024, t);
      g.stroke();
    }
  }
  // Fade to nothing well inside the plane's edge.
  g.globalCompositeOperation = "destination-in";
  const fade = g.createRadialGradient(512, 512, 0, 512, 512, 512);
  fade.addColorStop(0, "rgba(0,0,0,1)");
  fade.addColorStop(0.55, "rgba(0,0,0,0.6)");
  fade.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = fade;
  g.fillRect(0, 0, 1024, 1024);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 8;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, fog: false }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = y - 0.002;
  floor.renderOrder = -1;
  scene.add(floor);
}

/** A 3D point to stage pixels; `z` > 1 means behind the camera. */
export function toStage(v: THREE.Vector3, camera: THREE.Camera, w: number, h: number): { x: number; y: number; z: number } {
  const p = v.clone().project(camera);
  return { x: ((p.x + 1) / 2) * w, y: ((1 - p.y) / 2) * h, z: p.z };
}

/** Place an HTML label at a stage position, fading it with `alpha`. */
export function placeLabel(el: HTMLElement, at: { x: number; y: number; z?: number }, alpha = 1): void {
  const a = at.z !== undefined && at.z > 1 ? 0 : alpha;
  el.style.transform = `translate(${at.x.toFixed(1)}px, ${at.y.toFixed(1)}px)`;
  el.style.opacity = a.toFixed(3);
  el.style.visibility = a < 0.01 ? "hidden" : "visible";
}

/** Make a label element inside a stage's label layer. */
export function label(stage: HTMLElement, cls: string, html: string): HTMLElement {
  const layer = stage.querySelector<HTMLElement>("[data-labels]") ?? stage;
  const el = document.createElement("div");
  el.className = `s3d-label ${cls}`;
  el.innerHTML = html;
  layer.append(el);
  return el;
}

/** Fit a perspective camera so a box of the given half-size around `target` fills the stage. */
export function frame(camera: THREE.PerspectiveCamera, target: THREE.Vector3, dir: THREE.Vector3, halfW: number, halfH: number, margin = 1.1): void {
  const t = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
  const d = Math.max(halfH / t, halfW / (t * camera.aspect)) * margin;
  camera.position.copy(target).addScaledVector(dir.clone().normalize(), d);
  camera.lookAt(target);
}

export const ease = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
export const span = (a: number, b: number, x: number) => clamp((x - a) / (b - a));
export { clamp };

/** A soft radial shadow texture for contact shadows. */
export function shadowTexture(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  grad.addColorStop(0, "rgba(0,0,0,0.6)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

/** A canvas texture with text, for faces of blocks and cards. */
export function textTexture(lines: { text: string; font: string; color: string; y: number }[], w: number, h: number, bg: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.textAlign = "center";
  g.textBaseline = "middle";
  for (const l of lines) {
    g.font = l.font;
    g.fillStyle = l.color;
    g.fillText(l.text, w / 2, l.y);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
