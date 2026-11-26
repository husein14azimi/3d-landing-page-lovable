// ===== PRIMITIVES =====
// Tiny helpers that add flat-shaded low-poly meshes to a parent group.
import * as THREE from "three";

type Vec3 = [number, number, number];
export interface PrimOpts {
  rotation?: Vec3;
  emissive?: string;
  emissiveIntensity?: number;
  castShadow?: boolean;
}

// Materials are cached by color (+ emissive) so identical colors share one material.
const materialCache = new Map<string, THREE.MeshStandardMaterial>();
export function mat(color: string, emissive?: string, emissiveIntensity = 1) {
  const key = `${color}|${emissive ?? ""}|${emissiveIntensity}`;
  let m = materialCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.9, metalness: 0 });
    if (emissive) {
      m.emissive = new THREE.Color(emissive);
      m.emissiveIntensity = emissiveIntensity;
    }
    materialCache.set(key, m);
  }
  return m;
}

// Unit geometries are shared and scaled per mesh.
const geoCache = new Map<string, THREE.BufferGeometry>();
function geo(key: string, make: () => THREE.BufferGeometry) {
  let g = geoCache.get(key);
  if (!g) geoCache.set(key, (g = make()));
  return g;
}

function place(parent: THREE.Object3D, g: THREE.BufferGeometry, scale: Vec3, pos: Vec3, color: string, o: PrimOpts = {}) {
  const mesh = new THREE.Mesh(g, mat(color, o.emissive, o.emissiveIntensity));
  mesh.scale.set(...scale);
  mesh.position.set(...pos);
  if (o.rotation) mesh.rotation.set(...o.rotation);
  mesh.castShadow = o.castShadow ?? true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export const addBox = (p: THREE.Object3D, size: Vec3, pos: Vec3, color: string, o?: PrimOpts) =>
  place(p, geo("box", () => new THREE.BoxGeometry(1, 1, 1)), size, pos, color, o);

export const addCylinder = (p: THREE.Object3D, radius: number, height: number, pos: Vec3, color: string, o?: PrimOpts & { segments?: number; radiusTop?: number }) => {
  const seg = o?.segments ?? 10;
  const top = o?.radiusTop ?? 1;
  return place(p, geo(`cyl${seg}_${top}`, () => new THREE.CylinderGeometry(top, 1, 1, seg)), [radius, height, radius], pos, color, o);
};

export const addCone = (p: THREE.Object3D, radius: number, height: number, pos: Vec3, color: string, o?: PrimOpts & { segments?: number }) => {
  const seg = o?.segments ?? 8;
  return place(p, geo(`cone${seg}`, () => new THREE.ConeGeometry(1, 1, seg)), [radius, height, radius], pos, color, o);
};

export const addSphere = (p: THREE.Object3D, radius: number | Vec3, pos: Vec3, color: string, o?: PrimOpts & { detail?: number }) => {
  const d = o?.detail ?? 1;
  const s: Vec3 = typeof radius === "number" ? [radius, radius, radius] : radius;
  return place(p, geo(`ico${d}`, () => new THREE.IcosahedronGeometry(1, d)), s, pos, color, o);
};

export const addCapsule = (p: THREE.Object3D, radius: number, length: number, pos: Vec3, color: string, o?: PrimOpts) =>
  place(p, geo(`cap${radius}_${length}`, () => new THREE.CapsuleGeometry(radius, length, 3, 6)), [1, 1, 1], pos, color, o);

// Triangular prism (for roofs): ridge runs along X. size = [length, height, depth].
export const addPrism = (p: THREE.Object3D, size: Vec3, pos: Vec3, color: string, o?: PrimOpts) =>
  place(
    p,
    geo("prism", () => {
      const shape = new THREE.Shape();
      shape.moveTo(-0.5, 0);
      shape.lineTo(0.5, 0);
      shape.lineTo(0, 1);
      shape.closePath();
      const g = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false });
      g.translate(0, 0, -0.5);
      g.rotateY(Math.PI / 2);
      return g;
    }),
    size,
    pos,
    color,
    o,
  );

export const addDisc = (p: THREE.Object3D, radius: number, pos: Vec3, color: string, o?: PrimOpts & { segments?: number }) => {
  const seg = o?.segments ?? 14;
  const m = place(p, geo(`disc${seg}`, () => new THREE.CircleGeometry(1, seg).rotateX(-Math.PI / 2)), [radius, 1, radius], pos, color, { castShadow: false, ...o });
  return m;
};

export interface PersonOpts {
  height?: number;
  shirt?: string;
  pants?: string;
  skin?: string;
  hair?: string;
  hat?: string;
  seated?: boolean;
  pose?: "idle" | "bat" | "throw";
}

// A stylized, faceless figure (~12 meshes). Origin at the feet (or the seat when seated), facing +Z.
export function addPerson(parent: THREE.Object3D, o: PersonOpts = {}) {
  const g = new THREE.Group();
  const h = o.height ?? 1.8;
  const k = h / 1.8;
  const shirt = o.shirt ?? "#3f78c4";
  const pants = o.pants ?? "#3a3f4a";
  const skin = o.skin ?? "#e9b98f";
  const legLen = 0.8 * k;
  const hip = o.seated ? 0.45 * k : legLen;

  if (o.seated) {
    // thighs forward, shins down
    for (const sx of [-0.11, 0.11]) {
      addBox(g, [0.17 * k, 0.17 * k, 0.45 * k], [sx * k, hip, 0.2 * k], pants);
      addBox(g, [0.15 * k, 0.45 * k, 0.15 * k], [sx * k, hip / 2, 0.4 * k], pants);
      addBox(g, [0.17 * k, 0.08 * k, 0.24 * k], [sx * k, 0.04, 0.45 * k], "#2b2a28");
    }
  } else {
    for (const sx of [-0.11, 0.11]) {
      addBox(g, [0.16 * k, legLen, 0.18 * k], [sx * k, legLen / 2, 0], pants);
      addBox(g, [0.18 * k, 0.08 * k, 0.26 * k], [sx * k, 0.04, 0.04 * k], "#2b2a28");
    }
  }
  const torsoH = 0.6 * k;
  addBox(g, [0.44 * k, torsoH, 0.26 * k], [0, hip + torsoH / 2, 0], shirt);
  const shoulderY = hip + torsoH - 0.08 * k;
  const armL = 0.42 * k;
  const arms: THREE.Mesh[] = [];
  for (const sx of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(sx * 0.29 * k, shoulderY, 0);
    const arm = addCapsule(pivot, 0.07 * k, armL, [0, -armL / 2, 0], shirt);
    addSphere(pivot, 0.075 * k, [0, -armL - 0.08 * k, 0], skin, { detail: 0 });
    if (o.seated) pivot.rotation.x = -0.9;
    if (o.pose === "bat" && sx === 1) pivot.rotation.set(-1.2, 0, 0.5);
    if (o.pose === "throw" && sx === 1) pivot.rotation.set(-2.4, 0, 0.2);
    g.add(pivot);
    arms.push(arm);
  }
  addBox(g, [0.12 * k, 0.1 * k, 0.12 * k], [0, hip + torsoH + 0.05 * k, 0], skin);
  const headY = hip + torsoH + 0.22 * k;
  addSphere(g, 0.17 * k, [0, headY, 0], skin);
  if (o.hat) {
    addCylinder(g, 0.18 * k, 0.12 * k, [0, headY + 0.1 * k, 0], o.hat, { segments: 10 });
    addBox(g, [0.26 * k, 0.03 * k, 0.18 * k], [0, headY + 0.05 * k, 0.17 * k], o.hat);
  } else if (o.hair) {
    addSphere(g, [0.18 * k, 0.12 * k, 0.18 * k], [0, headY + 0.07 * k, -0.02 * k], o.hair);
  }
  parent.add(g);
  return g;
}
