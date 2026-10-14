import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
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
const ACCENT = new THREE.MeshStandardMaterial({ color: 0x3a3f46, roughness: 0.4, metalness: 0.4 });

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
        }
      })
      .catch(() => undefined);
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
