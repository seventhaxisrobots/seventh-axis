// Kinematics for the Studio's arm: a Universal Robots UR10e, built from the
// joint origins in UR's own calibration file (default_kinematics.yaml), plus a
// 160 mm two-finger gripper.
//
// The Studio is y-up with the robot base at the origin. URDF is z-up, so a
// URDF point (x, y, z) sits at (x, z, -y) here. For pick and place the tool
// always points straight down; a pose is the fingertip position plus the
// gripper's yaw about +y.

export const ARM = {
  tool: 0.16, // flange (tool0) to fingertip, the TCP
  grip: 0.04, // how far the fingers close down over the top of an object
} as const;

/** Centre height of a held object of height h: the fingers wrap its top ARM.grip. */
export const heldCentreY = (tipY: number, h: number): number => tipY + ARM.grip - h / 2;

/** UR10e rated reach from the base axis to the flange. */
export const REACH = 1.3;

export type Joints = [number, number, number, number, number, number];

export interface Pose {
  x: number;
  y: number;
  z: number;
  yaw: number;
}

/** Joint origins, parent to child, as xyz + roll/pitch/yaw (URDF convention). */
export const UR10E_JOINTS: { xyz: [number, number, number]; rpy: [number, number, number] }[] = [
  { xyz: [0, 0, 0.1807], rpy: [0, 0, 0] }, // shoulder_pan
  { xyz: [0, 0, 0], rpy: [Math.PI / 2, 0, 0] }, // shoulder_lift
  { xyz: [-0.6127, 0, 0], rpy: [0, 0, 0] }, // elbow
  { xyz: [-0.57155, 0, 0.17415], rpy: [0, 0, 0] }, // wrist_1
  { xyz: [0, -0.11985, 0], rpy: [Math.PI / 2, 0, 0] }, // wrist_2
  { xyz: [0, 0.11655, 0], rpy: [Math.PI / 2, Math.PI, Math.PI] }, // wrist_3
];
/** base_link to base_link_inertia: UR's internal frames face backwards. */
export const BASE_YAW = Math.PI;
/** wrist_3 to tool0 (via the flange frame). */
export const TOOL0_RPY: [number, number, number][] = [
  [0, -Math.PI / 2, -Math.PI / 2],
  [Math.PI / 2, 0, Math.PI / 2],
];

const LIMIT = 2 * Math.PI;
const ELBOW_LIMIT = Math.PI;

// 4x4 row-major matrices as flat arrays -------------------------------------

type M = number[];

function mul(a: M, b: M): M {
  const o = new Array(16).fill(0);
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += a[r * 4 + k] * b[k * 4 + c];
      o[r * 4 + c] = s;
    }
  return o;
}

/** URDF origin: translation, then R = Rz(yaw) Ry(pitch) Rx(roll). */
export function originMatrix([x, y, z]: [number, number, number], [roll, pitch, yaw]: [number, number, number]): M {
  const [cr, sr, cp, sp, cy, sy] = [Math.cos(roll), Math.sin(roll), Math.cos(pitch), Math.sin(pitch), Math.cos(yaw), Math.sin(yaw)];
  return [
    cy * cp, cy * sp * sr - sy * cr, cy * sp * cr + sy * sr, x,
    sy * cp, sy * sp * sr + cy * cr, sy * sp * cr - cy * sr, y,
    -sp, cp * sr, cp * cr, z,
    0, 0, 0, 1,
  ];
}

function rotZ(q: number): M {
  const c = Math.cos(q);
  const s = Math.sin(q);
  return [c, -s, 0, 0, s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

const JOINT_ORIGINS = UR10E_JOINTS.map((j) => originMatrix(j.xyz, j.rpy));
const BASE = originMatrix([0, 0, 0], [0, 0, BASE_YAW]);
const TOOL0 = mul(originMatrix([0, 0, 0], TOOL0_RPY[0]), originMatrix([0, 0, 0], TOOL0_RPY[1]));
const TCP = mul(TOOL0, originMatrix([0, 0, ARM.tool], [0, 0, 0]));

/** Fingertip frame in URDF base_link coordinates. */
function tcpMatrix(q: Joints): M {
  let t = BASE;
  for (let i = 0; i < 6; i++) t = mul(mul(t, JOINT_ORIGINS[i]), rotZ(q[i]));
  return mul(t, TCP);
}

interface Frame {
  p: [number, number, number];
  /** Approach (tool z) and finger axis (tool x), Studio frame. */
  a: [number, number, number];
  f: [number, number, number];
}

const toStudio = (x: number, y: number, z: number): [number, number, number] => [x, z, -y];

function frame(q: Joints): Frame {
  const t = tcpMatrix(q);
  return {
    p: toStudio(t[3], t[7], t[11]),
    a: toStudio(t[2], t[6], t[10]),
    f: toStudio(t[0], t[4], t[8]),
  };
}

export function wrap(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

export function forward(q: Joints): Pose {
  const { p, f } = frame(q);
  return { x: p[0], y: p[1], z: p[2], yaw: Math.atan2(f[0], f[2]) };
}

// Inverse kinematics --------------------------------------------------------

const cross = (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

function residual(q: Joints, target: Pose): number[] {
  const { p, a, f } = frame(q);
  const aT = [0, -1, 0];
  const fT = [Math.sin(target.yaw), 0, Math.cos(target.yaw)];
  const ca = cross(a, aT);
  const cf = cross(f, fT);
  return [target.x - p[0], target.y - p[1], target.z - p[2], 0.5 * (ca[0] + cf[0]), 0.5 * (ca[1] + cf[1]), 0.5 * (ca[2] + cf[2])];
}

/** Solve A x = b for a 6x6 system by Gaussian elimination. */
function solve6(A: number[][], b: number[]): number[] | null {
  const n = 6;
  const m = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let pivot = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[pivot][c])) pivot = r;
    if (Math.abs(m[pivot][c]) < 1e-12) return null;
    [m[c], m[pivot]] = [m[pivot], m[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const k = m[r][c] / m[c][c];
      for (let j = c; j <= n; j++) m[r][j] -= k * m[c][j];
    }
  }
  return m.map((row, i) => row[n] / row[i]);
}

/** Damped least-squares refinement from a seed. */
function refine(seed: Joints, target: Pose): { q: Joints; err: number } {
  const q = [...seed] as Joints;
  const h = 1e-6;
  let r = residual(q, target);
  for (let iter = 0; iter < 60; iter++) {
    const err = Math.hypot(...r);
    if (err < 1e-9) break;
    const J: number[][] = Array.from({ length: 6 }, () => new Array(6).fill(0));
    for (let j = 0; j < 6; j++) {
      const dq = [...q] as Joints;
      dq[j] += h;
      const rj = residual(dq, target);
      for (let i = 0; i < 6; i++) J[i][j] = -(rj[i] - r[i]) / h;
    }
    // (J Jt + λ² I) y = r, dq = Jt y
    const lambda = err > 0.05 ? 0.05 : 0.001;
    const JJt = J.map((ri, i) => J.map((rk, k) => ri.reduce((s, v, j) => s + v * rk[j], 0) + (i === k ? lambda * lambda : 0)));
    const y = solve6(JJt, r);
    if (!y) break;
    for (let j = 0; j < 6; j++) q[j] += J.reduce((s, row, i) => s + row[j] * y[i], 0);
    r = residual(q, target);
  }
  return { q, err: Math.hypot(...r) };
}

/**
 * The seed picks the branch: shoulder facing the target, elbow up, wrist
 * over the flange. It depends only on the target, so the same pose always
 * gives the same joints and paths stay on one branch.
 */
const D1 = 0.1807;
const A2 = 0.6127;
const A3 = 0.57155;
const D4 = 0.17415;
const D5 = 0.11985;
const D6 = 0.11655;

/**
 * Exact seed for a tool-down pose: the wrist sits D4 to the side of the arm
 * plane, D5 further out and D6 + tool above the fingertip, which leaves a
 * planar two-link problem for the shoulder and elbow (elbow up). The damped
 * solver then only has to tidy up the last micrometres and the gripper yaw.
 */
function seedsFor(p: Pose): Joints[] {
  const ux = p.x;
  const uy = -p.z;
  const r = Math.hypot(ux, uy);
  if (r <= D4) return [];
  const pan = wrap(Math.atan2(uy, ux) - Math.asin(D4 / r));
  const reach = Math.sqrt(r * r - D4 * D4) - D5;
  const height = p.y + D6 + ARM.tool - D1;
  const cos = (reach * reach + height * height - A2 * A2 - A3 * A3) / (2 * A2 * A3);
  if (cos < -1 || cos > 1) return [];
  const bend = Math.acos(cos);
  const theta = Math.atan2(height, reach) + Math.atan2(A3 * Math.sin(bend), A2 + A3 * Math.cos(bend));
  const lift = -theta;
  const elbow = bend;
  const wrist1 = -Math.PI / 2 - lift - elbow;
  return [wrap(pan - p.yaw), wrap(pan + p.yaw), wrap(pan - p.yaw + Math.PI)].map((w6) => [pan, lift, elbow, wrist1, -Math.PI / 2, w6] as Joints);
}

export function solveIK(p: Pose): Joints | null {
  const r = Math.hypot(p.x, p.z);
  if (r < 0.25) return null; // too close to the base axis to reach cleanly
  
  const fT = [Math.sin(p.yaw), 0, Math.cos(p.yaw)];
  for (const seed of seedsFor(p)) {
    const s = refine(seed, p);
    if (s.err > 1e-6) continue;
    const q = s.q.map(wrap) as Joints;
    const { a, f } = frame(q);
    // Right way up, fingers the right way round, elbow up.
    if (a[1] > -0.999 || f[0] * fT[0] + f[2] * fT[2] < 0.999) continue;
    if (q[2] <= 0 || Math.abs(q[2]) > ELBOW_LIMIT || q.some((v) => Math.abs(v) > LIMIT)) continue;
    return q;
  }
  return null;
}

/** Joint-space interpolation that takes the short way round on each axis. */
export function lerpJoints(a: Joints, b: Joints, t: number): Joints {
  return a.map((v, i) => v + wrap(b[i] - v) * t) as Joints;
}

export function jointDistance(a: Joints, b: Joints): number {
  return Math.max(...a.map((v, i) => Math.abs(wrap(b[i] - v))));
}
