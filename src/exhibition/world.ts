// ===== WORLD =====
// Renderer, camera, lights, tiny planet, road, props and stations, plus the main loop.
import * as THREE from "three";
import * as K from "./config";
import { mat } from "./primitives";
import { SECTIONS } from "./sections";
import type { SceneHandle } from "./scenes";
import { buildSign } from "./sign";
import { nearestStation, stepMotion, type MotionState } from "./motion";

const R = K.PLANET_RADIUS;

export interface WorldCallbacks {
  onStation: (index: number) => void;
  onFirstMove: () => void;
}

export class World {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(K.FOV, 1, K.NEAR, K.FAR);
  planet = new THREE.Group();
  stations: { group: THREE.Group; s: number; handle: SceneHandle | void }[] = [];
  motion: MotionState = { progress: 0, speed: 0, glideTarget: null };
  input = 0; // -1 back, +1 forward
  yawInput = 0; // keyboard look
  yaw = 0;
  pitch = 0;
  private raf = 0;
  private last = 0;
  private time = 0;
  private lastStation = -2;
  private moved = false;

  constructor(private canvas: HTMLCanvasElement, private cb: WorldCallbacks) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = K.ENABLE_SHADOWS;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene.background = new THREE.Color(K.PALETTE.sky);
    this.scene.fog = new THREE.Fog(K.PALETTE.sky, K.FOG_NEAR, K.FOG_FAR);
    this.camera.position.set(0, K.CAMERA_HEIGHT, 0);
    this.camera.rotation.order = "YXZ";

    this.scene.add(new THREE.HemisphereLight("#eaf6ff", "#5d7f4a", 1.6));
    const sun = new THREE.DirectionalLight("#fff4e0", 2.2);
    sun.position.set(18, 30, 12);
    sun.target.position.set(0, 0, -6);
    sun.castShadow = K.ENABLE_SHADOWS;
    sun.shadow.mapSize.set(1024, 1024);
    const sc = sun.shadow.camera;
    sc.left = sc.bottom = -22;
    sc.right = sc.top = 22;
    sc.near = 1;
    sc.far = 90;
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.03;
    this.scene.add(sun, sun.target);

    this.planet.position.set(0, -R, 0);
    this.scene.add(this.planet);
    this.buildGround();
    this.buildRoad();
    this.buildProps();
    this.buildStations();
  }

  private buildGround() {
    const g = new THREE.Mesh(new THREE.SphereGeometry(R, 64, 32), mat(K.PALETTE.grass));
    g.receiveShadow = true;
    this.planet.add(g);
  }

  /** Strip along the great circle, from distance d0 to d1, between x0 and x1, lifted h. */
  private strip(d0: number, d1: number, x0: number, x1: number, h: number, color: string) {
    const steps = Math.ceil((d1 - d0) / 1.5);
    const pos: number[] = [];
    const idx: number[] = [];
    for (let i = 0; i <= steps; i++) {
      const phi = (d0 + ((d1 - d0) * i) / steps) / R;
      const rr = R + h;
      const y = rr * Math.cos(phi), z = -rr * Math.sin(phi);
      pos.push(x0, y, z, x1, y, z);
      if (i < steps) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat(color));
    m.receiveShadow = true;
    this.planet.add(m);
  }

  private buildRoad() {
    const w = K.ROAD_WIDTH / 2;
    const start = -25, end = K.MAX_PROGRESS + 6;
    this.strip(start, end, -w - 0.6, -w, 0.025, K.PALETTE.verge);
    this.strip(start, end, w, w + 0.6, 0.025, K.PALETTE.verge);
    this.strip(start, end, -w, w, 0.035, K.PALETTE.road);
    // Dashed center line
    const n = Math.floor((end - start) / 4);
    const dashes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.15, 0.02, 1.8), mat(K.PALETTE.line), n);
    const o = new THREE.Object3D();
    for (let i = 0; i < n; i++) this.placeOnRoad(o, start + i * 4 + 1, 0, 0.04), dashes.setMatrixAt(i, o.matrix);
    dashes.receiveShadow = true;
    this.planet.add(dashes);
    // End-of-road barrier
    const bar = new THREE.Group();
    const p = new THREE.Object3D();
    this.placeOnRoad(p, end - 1, 0, 0);
    bar.position.copy(p.position);
    bar.quaternion.copy(p.quaternion);
    const b = new THREE.Mesh(new THREE.BoxGeometry(K.ROAD_WIDTH + 1, 0.4, 0.2), mat(K.PALETTE.red));
    b.position.y = 0.8;
    b.castShadow = true;
    bar.add(b);
    for (const sx of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1, 0.2), mat(K.PALETTE.cream));
      post.position.set(sx * (K.ROAD_WIDTH / 2 + 0.3), 0.5, 0);
      bar.add(post);
    }
    this.planet.add(bar);
  }

  /** Put an object at distance d along the road, x to the side, h above ground (planet-local). */
  placeOnRoad(o: THREE.Object3D, d: number, x: number, h: number) {
    const phi = d / R;
    o.position.set(x, (R + h) * Math.cos(phi), -(R + h) * Math.sin(phi));
    o.rotation.set(-phi, 0, 0);
    o.updateMatrix();
  }

  private buildProps() {
    // Seeded random: same layout every load
    let seed = K.PROP_SEED;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.18, 0.22, 1.6, 6).translate(0, 0.8, 0), mat(K.PALETTE.wood), K.PROP_COUNT);
    const crown = new THREE.InstancedMesh(new THREE.ConeGeometry(1.1, 2.8, 7).translate(0, 2.8, 0), mat(K.PALETTE.leafDark), K.PROP_COUNT);
    const lampCount = Math.floor((K.MAX_PROGRESS + 20) / 30);
    const pole = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.06, 0.08, 3.6, 6).translate(0, 1.8, 0), mat(K.PALETTE.darkGrey), lampCount);
    const lampHead = new THREE.InstancedMesh(new THREE.BoxGeometry(0.4, 0.25, 0.4).translate(0, 3.7, 0), mat(K.PALETTE.cream, "#fff1c9", 0.4), lampCount);
    const o = new THREE.Object3D();
    let placed = 0;
    for (let i = 0; i < K.PROP_COUNT * 3 && placed < K.PROP_COUNT; i++) {
      const d = -20 + rnd() * (K.MAX_PROGRESS + 30);
      const side = placed % 2 ? 1 : -1;
      const x = side * (K.ROAD_WIDTH / 2 + 3 + rnd() * 9);
      // keep station exhibits clear
      if (K.STATION_POSITIONS.some((s) => Math.abs(d - s) < 13 && Math.abs(x) < 16)) continue;
      this.placeOnRoad(o, d, x, 0);
      const s = 0.8 + rnd() * 0.6;
      o.scale.setScalar(s);
      o.rotateY(rnd() * 6);
      o.updateMatrix();
      trunk.setMatrixAt(placed, o.matrix);
      crown.setMatrixAt(placed, o.matrix);
      placed++;
    }
    trunk.count = crown.count = placed;
    for (let i = 0; i < lampCount; i++) {
      let d = 5 + i * 30;
      if (K.STATION_POSITIONS.some((s) => Math.abs(d - s) < 13)) d += 15; // keep exhibits clear
      this.placeOnRoad(o, d, (i % 2 ? 1 : -1) * (K.ROAD_WIDTH / 2 + 1), 0);
      o.scale.setScalar(1);
      o.updateMatrix();
      pole.setMatrixAt(i, o.matrix);
      lampHead.setMatrixAt(i, o.matrix);
    }
    for (const m of [trunk, crown, pole, lampHead]) { m.castShadow = true; this.planet.add(m); }
  }

  private buildStations() {
    const aniso = this.renderer.capabilities.getMaxAnisotropy();
    SECTIONS.forEach((sec, i) => {
      const s = K.STATION_POSITIONS[i]!;
      const pivot = new THREE.Group();
      pivot.rotation.x = -s / R;
      const group = new THREE.Group();
      group.position.set(0, R, 0);
      pivot.add(group);
      this.planet.add(pivot);
      buildSign(group, sec.title, sec.description, aniso);
      const sceneRoot = new THREE.Group();
      sceneRoot.position.set(K.SCENE_LAYOUT.x, 0, K.SCENE_LAYOUT.z);
      sceneRoot.rotation.y = K.SCENE_LAYOUT.rotationY;
      group.add(sceneRoot);
      const handle = sec.build(sceneRoot);
      this.stations.push({ group, s, handle });
    });
  }

  look(dx: number, dy: number) {
    const inv = K.INVERT_LOOK ? -1 : 1;
    this.yaw += dx * K.LOOK_SENSITIVITY * inv;
    this.pitch += dy * K.LOOK_SENSITIVITY * inv;
    this.pitch = Math.max(-K.MAX_PITCH, Math.min(K.MAX_PITCH, this.pitch));
  }

  glideTo(index: number) {
    const s = K.STATION_POSITIONS[index];
    if (s === undefined) return;
    this.motion.glideTarget = s;
    this.markMoved();
  }

  markMoved() {
    if (!this.moved) { this.moved = true; this.cb.onFirstMove(); }
  }

  resize() {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  start() {
    this.resize();
    const frame = (now: number) => {
      this.raf = requestAnimationFrame(frame);
      const dt = Math.min(this.last ? (now - this.last) / 1000 : 0, K.MAX_DT);
      this.last = now;
      this.time += dt;
      if (this.input !== 0) this.markMoved();
      stepMotion(this.motion, this.input, dt);
      if (this.yawInput) this.yaw += this.yawInput * K.KEY_LOOK_SPEED * dt;
      this.planet.rotation.x = this.motion.progress / R;
      this.camera.rotation.set(this.pitch, this.yaw, 0);
      for (const st of this.stations) {
        const vis = Math.abs(this.motion.progress - st.s) < K.STATION_VISIBLE_DISTANCE;
        st.group.visible = vis;
        if (vis && st.handle && st.handle.update) st.handle.update(this.time, dt);
      }
      const near = nearestStation(this.motion.progress, K.STATION_POSITIONS, K.STATION_SPACING);
      if (near !== this.lastStation) { this.lastStation = near; this.cb.onStation(near); }
      this.renderer.render(this.scene, this.camera);
      this.canvas.parentElement?.setAttribute("data-scene-ready", "true");
    };
    this.raf = requestAnimationFrame(frame);
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.renderer.dispose();
  }
}
