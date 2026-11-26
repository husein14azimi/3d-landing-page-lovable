// ===== SCENES =====
// One build function per diorama. Each builds around its own origin, front toward +Z,
// footprint radius ~5.5, resting on y = 0. It may return { update(time, dt) }.
import * as THREE from "three";
import { PALETTE as C } from "./config";
import { addBox, addCone, addCylinder, addDisc, addPerson, addPrism, addSphere, mat } from "./primitives";

export interface SceneHandle {
  update?: (time: number, dt: number) => void;
}

function addRoundTree(p: THREE.Object3D, x: number, z: number, s = 1) {
  addCylinder(p, 0.18 * s, 1.4 * s, [x, 0.7 * s, z], C.wood, { segments: 6 });
  addSphere(p, 0.95 * s, [x, 1.9 * s, z], C.leaf);
  addSphere(p, 0.7 * s, [x + 0.5 * s, 2.3 * s, z + 0.2 * s], C.leafDark);
  addSphere(p, 0.65 * s, [x - 0.45 * s, 2.4 * s, z - 0.2 * s], C.leaf);
}

function addPine(p: THREE.Object3D, x: number, z: number, s = 1) {
  addCylinder(p, 0.14 * s, 0.6 * s, [x, 0.3 * s, z], C.wood, { segments: 6 });
  addCone(p, 0.9 * s, 1.4 * s, [x, 1.2 * s, z], C.leafDark, { segments: 7 });
  addCone(p, 0.7 * s, 1.2 * s, [x, 1.9 * s, z], C.leaf, { segments: 7 });
  addCone(p, 0.45 * s, 0.9 * s, [x, 2.5 * s, z], C.leafDark, { segments: 7 });
}

// --- Station 1: Front-yard baseball ---
export function buildBaseball(p: THREE.Group): SceneHandle {
  addCylinder(p, 5.5, 0.3, [0, 0.15, 0], C.grass, { segments: 16, radiusTop: 0.97 });
  // House
  const hx = -0.6, hz = -2;
  addBox(p, [4, 3.4, 2.8], [hx, 0.3 + 1.7, hz], C.cream);
  addPrism(p, [4.4, 1.5, 3.2], [hx, 3.7, hz], C.roof);
  addBox(p, [0.5, 1.6, 0.5], [hx + 1.2, 4.3, hz - 0.5], C.brick);
  // Door, steps, porch
  addBox(p, [0.7, 1.3, 0.08], [hx, 0.95, hz + 1.42], C.blue);
  addBox(p, [1.3, 0.12, 0.5], [hx, 0.36, hz + 1.65], C.grey);
  addBox(p, [1.1, 0.12, 0.3], [hx, 0.24, hz + 1.95], C.grey);
  addBox(p, [1.6, 0.08, 0.9], [hx, 1.85, hz + 1.85], C.roof);
  for (const sx of [-0.7, 0.7]) addBox(p, [0.08, 1.5, 0.08], [hx + sx, 1.1, hz + 2.2], C.white);
  // Windows (white frame + faintly glowing glass)
  for (const [wx, wy] of [[-1.3, 1.2], [1.3, 1.2], [-1.0, 2.8], [1.0, 2.8]] as const) {
    addBox(p, [0.75, 0.75, 0.06], [hx + wx, wy, hz + 1.42], C.white);
    addBox(p, [0.58, 0.58, 0.08], [hx + wx, wy, hz + 1.43], "#cfe6f2", { emissive: "#bfe3f0", emissiveIntensity: 0.25 });
  }
  // Picket fence along the front with a gap in the middle
  for (let i = -8; i <= 8; i++) {
    if (Math.abs(i) <= 1) continue;
    const x = i * 0.32;
    addBox(p, [0.12, 0.6, 0.06], [x, 0.6, 4.2], C.white);
  }
  for (const side of [-1, 1]) {
    addBox(p, [2.3, 0.07, 0.05], [side * 1.6, 0.5, 4.18], C.white);
    addBox(p, [2.3, 0.07, 0.05], [side * 1.6, 0.75, 4.18], C.white);
  }
  // Mailbox
  addBox(p, [0.08, 1, 0.08], [1.0, 0.8, 4.6], C.wood);
  addBox(p, [0.3, 0.3, 0.5], [1.0, 1.35, 4.6], C.blue);
  addBox(p, [0.03, 0.3, 0.08], [1.17, 1.55, 4.5], C.red);
  addRoundTree(p, 3.3, -1.5);
  // Father and son
  const fx = -2.3, sx = 2.1, fz = 2.2;
  const dad = addPerson(p, { height: 1.85, shirt: C.blue, pants: "#3a3f4a", hat: C.red, pose: "throw" });
  dad.position.set(fx, 0.3, fz);
  dad.rotation.y = Math.PI / 2;
  const son = addPerson(p, { height: 1.15, shirt: C.red, pants: "#3b5c8f", hat: C.blue, pose: "bat" });
  son.position.set(sx, 0.3, fz);
  son.rotation.y = -Math.PI / 2;
  addCylinder(son, 0.03, 0.75, [0.32, 0.95, 0.45], C.wood, { rotation: [1.1, 0, 0], segments: 6 });
  const ball = addSphere(p, 0.09, [fx, 2, fz], C.white, { detail: 1 });
  return {
    update(t) {
      // Ping-pong across in ~2 s each way
      const phase = (t % 4) / 2;
      const u = phase < 1 ? phase : 2 - phase;
      ball.position.x = fx + 0.4 + (sx - fx - 0.8) * u;
      ball.position.y = 1.9 + Math.sin(Math.PI * u) * 1.8;
    },
  };
}

// --- Station 2: Dry under the umbrella ---
export function buildUmbrella(p: THREE.Group): SceneHandle {
  addCylinder(p, 5.5, 0.25, [0, 0.12, 0], C.grassDark, { segments: 16, radiusTop: 0.97 });
  addDisc(p, 2.6, [0, 0.26, 0], "#a5c97a", { segments: 16 });
  for (const [x, z, r] of [[-3.4, 1.5, 0.8], [3.2, 2.4, 1.0], [2.8, -2.6, 0.7], [-2.6, -3, 0.6], [0.4, 4.1, 0.6]] as const)
    addDisc(p, r, [x, 0.255, z], C.puddle, { segments: 10 });
  // Umbrella canopy: alternating wedges of a hemisphere
  const canopyR = 2.7;
  const wedges = 10;
  for (let i = 0; i < wedges; i++) {
    const g = new THREE.SphereGeometry(canopyR, 2, 4, (i / wedges) * Math.PI * 2, (Math.PI * 2) / wedges, 0, Math.PI / 2);
    g.scale(1, 0.45, 1);
    const m = new THREE.Mesh(g, mat(i % 2 ? C.cream : C.red));
    m.material.side = THREE.FrontSide;
    m.position.y = 3.3;
    m.castShadow = true;
    p.add(m);
  }
  addCylinder(p, 0.06, 3.9, [0, 2.15, 0], C.wood, { segments: 6 });
  addSphere(p, 0.1, [0, 4.55, 0], C.wood, { detail: 0 });
  // Bench
  addBox(p, [2.2, 0.1, 0.6], [0, 0.72, -0.2], C.wood);
  addBox(p, [2.2, 0.5, 0.08], [0, 1.05, -0.5], C.wood);
  for (const sx of [-0.95, 0.95]) addBox(p, [0.1, 0.5, 0.5], [sx, 0.5, -0.2], C.darkGrey);
  // Older couple
  const a = addPerson(p, { height: 1.7, shirt: "#6b7fa8", pants: "#4a4640", hair: C.hair, seated: true });
  a.position.set(-0.45, 0.32, -0.25);
  const b = addPerson(p, { height: 1.6, shirt: "#c7768a", pants: "#4a4640", hair: C.hair, seated: true });
  b.position.set(0.45, 0.32, -0.25);
  addBox(p, [1.8, 0.08, 0.6], [0, 0.85, 0.05], C.accent); // blanket over knees
  addBox(p, [1.8, 0.4, 0.06], [0, 0.66, 0.35], C.accent);
  // Rain cloud
  for (const [x, y, z, r] of [[0, 8, 0, 1.8], [1.7, 7.8, 0.3, 1.4], [-1.7, 7.9, -0.2, 1.5], [0.6, 8.4, -0.8, 1.3], [-0.8, 7.7, 1.0, 1.2]] as const)
    addSphere(p, [r, r * 0.6, r], [x, y, z], "#8a9099", { castShadow: false });
  // Rain: instanced drops that only spawn outside the canopy radius
  const COUNT = 120;
  const drops = new THREE.InstancedMesh(new THREE.BoxGeometry(0.03, 0.35, 0.03), mat("#7f97ad"), COUNT);
  const ang = new Float32Array(COUNT), rad = new Float32Array(COUNT), yy = new Float32Array(COUNT), spd = new Float32Array(COUNT);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < COUNT; i++) {
    ang[i] = rnd() * Math.PI * 2;
    rad[i] = canopyR + 0.35 + rnd() * (4.8 - canopyR);
    yy[i] = rnd() * 7.5;
    spd[i] = 7 + rnd() * 3;
  }
  p.add(drops);
  const d = new THREE.Object3D();
  return {
    update(_t, dt) {
      for (let i = 0; i < COUNT; i++) {
        yy[i]! -= spd[i]! * dt;
        if (yy[i]! < 0.3) yy[i] = 7.4;
        d.position.set(Math.cos(ang[i]!) * rad[i]!, yy[i]!, Math.sin(ang[i]!) * rad[i]!);
        d.updateMatrix();
        drops.setMatrixAt(i, d.matrix);
      }
      drops.instanceMatrix.needsUpdate = true;
    },
  };
}

// --- Station 3: Campervan by the lake ---
export function buildCamper(p: THREE.Group): SceneHandle {
  addCylinder(p, 5.5, 0.25, [0, 0.12, 0], C.grass, { segments: 16, radiusTop: 0.97 });
  addDisc(p, 2.6, [0.5, 0.26, -2.6], C.water, { segments: 16, emissive: "#3f78c4", emissiveIntensity: 0.25 });
  addCone(p, 2.6, 5, [-2.2, 2.5, -5.2], "#8aa0a8", { segments: 6 });
  addCone(p, 3.2, 6.5, [1.2, 3.25, -6], "#7d929b", { segments: 6 });
  addCone(p, 2.2, 4, [4, 2, -5], "#93a8ae", { segments: 6 });
  // Van (faces +X)
  const v = new THREE.Group();
  v.position.set(-1.2, 0.25, 1.4);
  v.rotation.y = 0.25;
  p.add(v);
  addBox(v, [3.2, 1.6, 1.6], [-0.3, 1.25, 0], C.mint);
  addBox(v, [3.2, 0.5, 1.62], [-0.3, 0.65, 0], C.white);
  addBox(v, [3.22, 0.12, 1.64], [-0.3, 1.0, 0], C.accent);
  addBox(v, [1.1, 1.1, 1.6], [1.85, 0.95, 0], C.mint);
  addBox(v, [0.4, 0.9, 1.5], [1.45, 1.85, 0], C.mint, { rotation: [0, 0, -0.4] });
  addBox(v, [0.06, 0.6, 1.3], [2.42, 1.3, 0], "#2e4a7a", { rotation: [0, 0, -0.15] });
  for (const wx of [-1.3, -0.2]) addBox(v, [0.7, 0.5, 1.64], [wx, 1.55, 0], "#2e4a7a");
  for (const z of [-0.45, 0.45]) addBox(v, [0.05, 0.15, 0.2], [2.41, 0.75, z], "#fff6d0", { emissive: "#fff3c4", emissiveIntensity: 0.8 });
  for (const wx of [-1.3, 1.6]) for (const wz of [-0.8, 0.8]) {
    addCylinder(v, 0.35, 0.25, [wx, 0.35, wz], C.ink, { rotation: [Math.PI / 2, 0, 0], segments: 10 });
    addCylinder(v, 0.15, 0.27, [wx, 0.35, wz], C.grey, { rotation: [Math.PI / 2, 0, 0], segments: 8 });
  }
  // Striped awning on the lake side (-Z of the van)
  for (let i = 0; i < 6; i++) addBox(v, [0.4, 0.06, 1.4], [-1.7 + i * 0.4 + 0.2, 2.0, -1.5], i % 2 ? C.cream : C.accent, { rotation: [-0.2, 0, 0] });
  for (const wx of [-1.6, 0.6]) addCylinder(v, 0.03, 1.9, [wx, 1.0, -2.15], C.grey, { segments: 5 });
  // Chairs + figures seen from behind, facing the lake (-Z)
  for (const [cx, shirt] of [[-0.6, C.blue], [1.1, C.red]] as const) {
    const ch = new THREE.Group();
    ch.position.set(cx, 0.25, -0.3);
    ch.rotation.y = Math.PI;
    p.add(ch);
    addBox(ch, [0.6, 0.06, 0.55], [0, 0.42, 0.1], C.accent);
    addBox(ch, [0.6, 0.6, 0.05], [0, 0.72, -0.18], C.accent, { rotation: [-0.2, 0, 0] });
    for (const lx of [-0.27, 0.27]) addBox(ch, [0.04, 0.45, 0.04], [lx, 0.2, 0.1], C.darkGrey, { rotation: [0.4, 0, 0] });
    const per = addPerson(ch, { height: 1.7, shirt, hair: C.hair, seated: true });
    per.position.set(0, 0.0, 0);
  }
  // Campfire
  const fx = 2.6, fz = 1.0;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    addSphere(p, 0.16, [fx + Math.cos(a) * 0.55, 0.32, fz + Math.sin(a) * 0.55], C.grey, { detail: 0 });
  }
  for (let i = 0; i < 3; i++) addCylinder(p, 0.07, 0.8, [fx, 0.35, fz], C.wood, { rotation: [Math.PI / 2, (i * Math.PI) / 3, 0.2], segments: 6 });
  const f1 = addCone(p, 0.35, 0.8, [fx, 0.7, fz], C.accent, { emissive: "#f28a1a", emissiveIntensity: 1.2, castShadow: false });
  const f2 = addCone(p, 0.2, 0.55, [fx, 0.75, fz], "#ffd86b", { emissive: "#ffd04a", emissiveIntensity: 1.4, castShadow: false });
  addPine(p, -4.2, -1.8, 1.1);
  addPine(p, -3.9, 2.8, 0.9);
  addPine(p, 4.3, -2.0, 1.2);
  addPine(p, 4.4, 2.8, 0.8);
  return {
    update(t) {
      const a = 1 + Math.sin(t * 13) * 0.12 + Math.sin(t * 7.3) * 0.08;
      const b = 1 + Math.sin(t * 17 + 1) * 0.15;
      f1.scale.set(0.35 * b, 0.8 * a, 0.35 * b);
      f2.scale.set(0.2 * a, 0.55 * b, 0.2 * a);
    },
  };
}
