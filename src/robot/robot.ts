import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DecalGeometry } from "three/addons/geometries/DecalGeometry.js";
import { ARM, BASE_YAW, TOOL0_RPY, UR10E_JOINTS, type Joints } from "./kinematics.ts";

// The website's copy of the Studio's robot model, for the homepage and About scenes.
// The product (seventhaxisrobots/kata) owns the original.
//
// A Universal Robots UR10e (meshes from UR's ROS 2 description, BSD-3-Clause)
// on the exact joint chain in kinematics.ts, with a two-finger gripper. The
// scene is y-up; the robot's own frames are z-up like its URDF.

/** Mesh offsets from UR's visual_parameters.yaml: [x, y, z], [roll, pitch, yaw]. */
const VISUAL: Record<string, [[number, number, number], [number, number, number]]> = {
  base: [[0, 0, 0], [0, 0, Math.PI]],
  shoulder: [[0, 0, 0], [0, 0, Math.PI]],
  upperarm: [[0, 0, 0.1762], [Math.PI / 2, 0, -Math.PI / 2]],
  forearm: [[0, 0, 0.0393], [Math.PI / 2, 0, -Math.PI / 2]],
  wrist1: [[0, 0, -0.135], [Math.PI / 2, 0, 0]],
  wrist2: [[0, 0, -0.12], [0, 0, 0]],
  wrist3: [[0, -0.0005, -0.1168], [Math.PI / 2, 0, 0]],
};
const LINKS = ["shoulder", "upperarm", "forearm", "wrist1", "wrist2", "wrist3"];

const GRIPPER = new THREE.MeshStandardMaterial({ color: 0x2a313c, roughness: 0.45, metalness: 0.6 });
const PAD = new THREE.MeshStandardMaterial({ color: 0x0e1116, roughness: 0.9 });
const ACCENT = new THREE.MeshStandardMaterial({ color: 0xa5b4ff, roughness: 0.4, metalness: 0.1 });

/** The Seventh Axis mark, the same path as the site logo (64 x 64). */
const MARK = "M11.1 8H52.9L22.2 56H16L43.1 13.7H11.1ZM17.7 34.2a14.4 14.4 0 1 0 28.8 0a14.4 14.4 0 1 0-28.8 0Z";
let markMaterial: THREE.MeshStandardMaterial | undefined;

/** The decal: the mark, then SEVENTH AXIS, laid out to run along the arm. */
function logoMaterial(): THREE.MeshStandardMaterial {
  if (markMaterial) return markMaterial;
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 128;
  const g = canvas.getContext("2d")!;
  const draw = () => {
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.fillStyle = "#1b2030";
    g.save();
    g.translate(4, 4);
    g.scale(1.875, 1.875);
    g.fill(new Path2D(MARK), "evenodd");
    g.restore();
    g.font = "600 76px 'Inter Variable', Inter, system-ui, sans-serif";
    (g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "14px";
    g.textBaseline = "middle";
    g.fillText("SEVENTH AXIS", 150, 68);
  };
  draw();
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  document.fonts?.load("600 76px 'Inter Variable'").then(() => {
    draw();
    map.needsUpdate = true;
  });
  markMaterial = new THREE.MeshStandardMaterial({
    map,
    transparent: true,
    roughness: 0.5,
    metalness: 0.1,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
  });
  return markMaterial;
}

function place(obj: THREE.Object3D, xyz: [number, number, number], rpy: [number, number, number]): THREE.Object3D {
  obj.position.set(...xyz);
  obj.rotation.set(rpy[0], rpy[1], rpy[2], "ZYX");
  return obj;
}

function part(geo: THREE.BufferGeometry, mat: THREE.Material, [x, y, z]: [number, number, number]): THREE.Mesh {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export class RobotModel {
  readonly root = new THREE.Group();
  private readonly rotors: THREE.Group[] = [];
  private readonly mounts = new Map<string, THREE.Group>();
  private readonly links = new Map<string, THREE.Object3D>();
  private readonly fingers: THREE.Object3D[] = [];
  /** Sits at the fingertip centre, for cameras that follow the tool. */
  readonly tip = new THREE.Object3D();
  readonly ready: Promise<void>;

  constructor() {
    // URDF z-up into the scene's y-up, then UR's backwards-facing internal base frame.
    const urdf = new THREE.Group();
    urdf.rotation.x = -Math.PI / 2;
    this.root.add(urdf);
    const base = place(new THREE.Group(), [0, 0, 0], [0, 0, BASE_YAW]) as THREE.Group;
    urdf.add(base);
    this.mounts.set("base", base);

    let parent: THREE.Object3D = base;
    UR10E_JOINTS.forEach((j, i) => {
      const joint = place(new THREE.Group(), j.xyz, j.rpy);
      const rotor = new THREE.Group();
      joint.add(rotor);
      parent.add(joint);
      this.rotors.push(rotor);
      this.mounts.set(LINKS[i], rotor);
      parent = rotor;
    });

    // Flange and tool0, then the gripper along tool0's +z.
    const flange = place(new THREE.Group(), [0, 0, 0], TOOL0_RPY[0]);
    const tool0 = place(new THREE.Group(), [0, 0, 0], TOOL0_RPY[1]);
    parent.add(flange);
    flange.add(tool0);
    this.buildGripper(tool0);
    this.tip.position.z = ARM.tool;
    tool0.add(this.tip);

    this.ready = new GLTFLoader()
      .loadAsync("/models/ur10e.glb")
      .then((gltf) => {
        for (const name of Object.keys(VISUAL)) {
          const link = gltf.scene.getObjectByName(name);
          const mount = this.mounts.get(name);
          const offset = VISUAL[name];
          if (!link || !mount) continue;
          place(link, offset[0], offset[1]);
          link.traverse((m) => {
            const mesh = m as THREE.Mesh;
            if (!mesh.isMesh) return;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            const mat = mesh.material as THREE.MeshStandardMaterial;
            // UR's light grey shell and blue joint caps, with a satin finish.
            mat.roughness = 0.38;
            mat.metalness = 0.15;
          });
          mount.add(link);
          this.links.set(name, link);
        }
        this.addLogos();
      })
      .catch(() => undefined);
  }

  /** The Seventh Axis decal on both sides of the upper arm (the long link off the shoulder), running along it. */
  private addLogos(): void {
    this.root.updateMatrixWorld(true);
    const mount = this.mounts.get("upperarm");
    const link = this.links.get("upperarm");
    if (!mount || !link) return;
    const meshes: THREE.Mesh[] = [];
    link.traverse((m) => (m as THREE.Mesh).isMesh && meshes.push(m as THREE.Mesh));
    if (!meshes.length) return;
    const box = new THREE.Box3();
    meshes.forEach((m) => box.expandByObject(m));
    const span = box.getSize(new THREE.Vector3());
    // The tube runs along the box's longest side; the joint axis is the rotor's z.
    const axis = new THREE.Vector3(0, 0, 1).transformDirection(mount.matrixWorld);
    const tube = span.x >= span.y && span.x >= span.z ? new THREE.Vector3(1, 0, 0) : span.y >= span.z ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1);
    const centre = box.getCenter(new THREE.Vector3());
    const ray = new THREE.Raycaster();
    const toLocal = mount.matrixWorld.clone().invert();
    const length = (box.max.dot(tube) - box.min.dot(tube)) * 0.5;
    for (const side of [1, -1]) {
      const dir = axis.clone().multiplyScalar(side);
      ray.set(centre.clone().addScaledVector(dir, 1), dir.clone().negate());
      const hit = ray.intersectObjects(meshes, false)[0];
      if (!hit) continue;
      // Text runs along the tube and stays upright: its "up" is the side facing the sky.
      const along = tube.clone();
      let up = dir.clone().cross(along);
      if (up.y < 0) {
        along.negate();
        up = dir.clone().cross(along);
      }
      const aim = new THREE.Object3D();
      aim.position.copy(hit.point);
      aim.up.copy(up);
      aim.lookAt(hit.point.clone().add(dir));
      const geo = new DecalGeometry(hit.object as THREE.Mesh, hit.point, aim.rotation, new THREE.Vector3(length, length / 8, 0.08));
      geo.applyMatrix4(toLocal);
      const decal = new THREE.Mesh(geo, logoMaterial());
      decal.renderOrder = 1;
      mount.add(decal);
    }
  }

  /** A compact adaptive two-finger gripper; fingers open along tool x. */
  private buildGripper(tool0: THREE.Object3D): void {
    tool0.add(part(new THREE.CylinderGeometry(0.038, 0.038, 0.012, 40).rotateX(Math.PI / 2), ACCENT, [0, 0, 0.006]));
    tool0.add(part(new THREE.CylinderGeometry(0.04, 0.034, 0.03, 40).rotateX(Math.PI / 2), GRIPPER, [0, 0, 0.027]));
    tool0.add(part(new THREE.BoxGeometry(0.15, 0.06, 0.05), GRIPPER, [0, 0, 0.066]));
    for (const side of [-1, 1]) {
      const finger = new THREE.Group();
      finger.userData.side = side;
      finger.add(part(new THREE.BoxGeometry(0.018, 0.05, 0.075), GRIPPER, [0, 0, 0.123]));
      finger.add(part(new THREE.BoxGeometry(0.006, 0.045, 0.05), PAD, [-side * 0.012, 0, 0.13]));
      this.fingers.push(finger);
      tool0.add(finger);
    }
  }

  setJoints(q: Joints): void {
    this.rotors.forEach((r, i) => (r.rotation.z = q[i]));
  }

  /** Distance between the finger pads, in metres. */
  setGripper(opening: number): void {
    for (const f of this.fingers) f.position.x = f.userData.side * (opening / 2 + 0.015);
  }
}
