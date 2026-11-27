import { useEffect, useRef, useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import * as THREE from "three";
var STATION_POSITIONS = Array.from({ length: 3 }, (_, i) => 60 + i * 90);
var MAX_PROGRESS = STATION_POSITIONS[2] + 40;
var GLIDE_EASE = 1.6;
var MAX_DT = .05;
var CAMERA_HEIGHT = 1.7;
var NEAR = .05;
var LOOK_SENSITIVITY = .005;
var KEY_LOOK_SPEED = 1.6;
var MAX_PITCH = 89 * Math.PI / 180;
var ROAD_WIDTH = 4.2;
var PROP_SEED = 1337;
var PALETTE = {
	sky: "#bfe3f0",
	grass: "#7bbf6a",
	grassDark: "#6aad5b",
	road: "#4a4d52",
	verge: "#8fa58a",
	line: "#f2e9c9",
	wood: "#8a5a3b",
	cream: "#f3e9d2",
	brick: "#b5533c",
	roof: "#7a3b2e",
	red: "#d64541",
	blue: "#3f78c4",
	accent: "#f2a541",
	ink: "#2b2a28",
	white: "#fbfaf5",
	skin: "#e9b98f",
	skinDark: "#b97f57",
	grey: "#8d9196",
	darkGrey: "#5b6066",
	leaf: "#4f9a4a",
	leafDark: "#3f8240",
	mint: "#9fd8c4",
	water: "#5fa8d3",
	puddle: "#2f5d8a",
	hair: "#d9d6cf"
};
var SIGN_LAYOUT = {
	x: -4.5,
	z: -2,
	rotationY: .45,
	boardWidth: 5,
	boardHeight: 3.75
};
var SCENE_LAYOUT = {
	x: 7,
	z: -2,
	rotationY: -.45
};
//#endregion
//#region src/exhibition/primitives.ts
var materialCache = /* @__PURE__ */ new Map();
function mat(color, emissive, emissiveIntensity = 1) {
	const key = `${color}|${emissive ?? ""}|${emissiveIntensity}`;
	let m = materialCache.get(key);
	if (!m) {
		m = new THREE.MeshStandardMaterial({
			color,
			flatShading: true,
			roughness: .9,
			metalness: 0
		});
		if (emissive) {
			m.emissive = new THREE.Color(emissive);
			m.emissiveIntensity = emissiveIntensity;
		}
		materialCache.set(key, m);
	}
	return m;
}
var geoCache = /* @__PURE__ */ new Map();
function geo(key, make) {
	let g = geoCache.get(key);
	if (!g) geoCache.set(key, g = make());
	return g;
}
function place(parent, g, scale, pos, color, o = {}) {
	const mesh = new THREE.Mesh(g, mat(color, o.emissive, o.emissiveIntensity));
	mesh.scale.set(...scale);
	mesh.position.set(...pos);
	if (o.rotation) mesh.rotation.set(...o.rotation);
	mesh.castShadow = o.castShadow ?? true;
	mesh.receiveShadow = true;
	parent.add(mesh);
	return mesh;
}
var addBox = (p, size, pos, color, o) => place(p, geo("box", () => new THREE.BoxGeometry(1, 1, 1)), size, pos, color, o);
var addCylinder = (p, radius, height, pos, color, o) => {
	const seg = o?.segments ?? 10;
	const top = o?.radiusTop ?? 1;
	return place(p, geo(`cyl${seg}_${top}`, () => new THREE.CylinderGeometry(top, 1, 1, seg)), [
		radius,
		height,
		radius
	], pos, color, o);
};
var addCone = (p, radius, height, pos, color, o) => {
	const seg = o?.segments ?? 8;
	return place(p, geo(`cone${seg}`, () => new THREE.ConeGeometry(1, 1, seg)), [
		radius,
		height,
		radius
	], pos, color, o);
};
var addSphere = (p, radius, pos, color, o) => {
	const d = o?.detail ?? 1;
	const s = typeof radius === "number" ? [
		radius,
		radius,
		radius
	] : radius;
	return place(p, geo(`ico${d}`, () => new THREE.IcosahedronGeometry(1, d)), s, pos, color, o);
};
var addCapsule = (p, radius, length, pos, color, o) => place(p, geo(`cap${radius}_${length}`, () => new THREE.CapsuleGeometry(radius, length, 3, 6)), [
	1,
	1,
	1
], pos, color, o);
var addPrism = (p, size, pos, color, o) => place(p, geo("prism", () => {
	const shape = new THREE.Shape();
	shape.moveTo(-.5, 0);
	shape.lineTo(.5, 0);
	shape.lineTo(0, 1);
	shape.closePath();
	const g = new THREE.ExtrudeGeometry(shape, {
		depth: 1,
		bevelEnabled: false
	});
	g.translate(0, 0, -.5);
	g.rotateY(Math.PI / 2);
	return g;
}), size, pos, color, o);
var addDisc = (p, radius, pos, color, o) => {
	const seg = o?.segments ?? 14;
	return place(p, geo(`disc${seg}`, () => new THREE.CircleGeometry(1, seg).rotateX(-Math.PI / 2)), [
		radius,
		1,
		radius
	], pos, color, {
		castShadow: false,
		...o
	});
};
function addPerson(parent, o = {}) {
	const g = new THREE.Group();
	const k = (o.height ?? 1.8) / 1.8;
	const shirt = o.shirt ?? "#3f78c4";
	const pants = o.pants ?? "#3a3f4a";
	const skin = o.skin ?? "#e9b98f";
	const legLen = .8 * k;
	const hip = o.seated ? .45 * k : legLen;
	if (o.seated) for (const sx of [-.11, .11]) {
		addBox(g, [
			.17 * k,
			.17 * k,
			.45 * k
		], [
			sx * k,
			hip,
			.2 * k
		], pants);
		addBox(g, [
			.15 * k,
			.45 * k,
			.15 * k
		], [
			sx * k,
			hip / 2,
			.4 * k
		], pants);
		addBox(g, [
			.17 * k,
			.08 * k,
			.24 * k
		], [
			sx * k,
			.04,
			.45 * k
		], "#2b2a28");
	}
	else for (const sx of [-.11, .11]) {
		addBox(g, [
			.16 * k,
			legLen,
			.18 * k
		], [
			sx * k,
			legLen / 2,
			0
		], pants);
		addBox(g, [
			.18 * k,
			.08 * k,
			.26 * k
		], [
			sx * k,
			.04,
			.04 * k
		], "#2b2a28");
	}
	const torsoH = .6 * k;
	addBox(g, [
		.44 * k,
		torsoH,
		.26 * k
	], [
		0,
		hip + torsoH / 2,
		0
	], shirt);
	const shoulderY = hip + torsoH - .08 * k;
	const armL = .42 * k;
	const arms = [];
	for (const sx of [-1, 1]) {
		const pivot = new THREE.Group();
		pivot.position.set(sx * .29 * k, shoulderY, 0);
		const arm = addCapsule(pivot, .07 * k, armL, [
			0,
			-armL / 2,
			0
		], shirt);
		addSphere(pivot, .075 * k, [
			0,
			-armL - .08 * k,
			0
		], skin, { detail: 0 });
		if (o.seated) pivot.rotation.x = -.9;
		if (o.pose === "bat" && sx === 1) pivot.rotation.set(-1.2, 0, .5);
		if (o.pose === "throw" && sx === 1) pivot.rotation.set(-2.4, 0, .2);
		g.add(pivot);
		arms.push(arm);
	}
	addBox(g, [
		.12 * k,
		.1 * k,
		.12 * k
	], [
		0,
		hip + torsoH + .05 * k,
		0
	], skin);
	const headY = hip + torsoH + .22 * k;
	addSphere(g, .17 * k, [
		0,
		headY,
		0
	], skin);
	if (o.hat) {
		addCylinder(g, .18 * k, .12 * k, [
			0,
			headY + .1 * k,
			0
		], o.hat, { segments: 10 });
		addBox(g, [
			.26 * k,
			.03 * k,
			.18 * k
		], [
			0,
			headY + .05 * k,
			.17 * k
		], o.hat);
	} else if (o.hair) addSphere(g, [
		.18 * k,
		.12 * k,
		.18 * k
	], [
		0,
		headY + .07 * k,
		-.02 * k
	], o.hair);
	parent.add(g);
	return g;
}
//#endregion
//#region src/exhibition/scenes.ts
function addRoundTree(p, x, z, s = 1) {
	addCylinder(p, .18 * s, 1.4 * s, [
		x,
		.7 * s,
		z
	], PALETTE.wood, { segments: 6 });
	addSphere(p, .95 * s, [
		x,
		1.9 * s,
		z
	], PALETTE.leaf);
	addSphere(p, .7 * s, [
		x + .5 * s,
		2.3 * s,
		z + .2 * s
	], PALETTE.leafDark);
	addSphere(p, .65 * s, [
		x - .45 * s,
		2.4 * s,
		z - .2 * s
	], PALETTE.leaf);
}
function addPine(p, x, z, s = 1) {
	addCylinder(p, .14 * s, .6 * s, [
		x,
		.3 * s,
		z
	], PALETTE.wood, { segments: 6 });
	addCone(p, .9 * s, 1.4 * s, [
		x,
		1.2 * s,
		z
	], PALETTE.leafDark, { segments: 7 });
	addCone(p, .7 * s, 1.2 * s, [
		x,
		1.9 * s,
		z
	], PALETTE.leaf, { segments: 7 });
	addCone(p, .45 * s, .9 * s, [
		x,
		2.5 * s,
		z
	], PALETTE.leafDark, { segments: 7 });
}
function buildBaseball(p) {
	addCylinder(p, 5.5, .3, [
		0,
		.15,
		0
	], PALETTE.grass, {
		segments: 16,
		radiusTop: .97
	});
	const hx = -.6, hz = -2;
	addBox(p, [
		4,
		3.4,
		2.8
	], [
		hx,
		2,
		hz
	], PALETTE.cream);
	addPrism(p, [
		4.4,
		1.5,
		3.2
	], [
		hx,
		3.7,
		hz
	], PALETTE.roof);
	addBox(p, [
		.5,
		1.6,
		.5
	], [
		.6,
		4.3,
		-2.5
	], PALETTE.brick);
	addBox(p, [
		.7,
		1.3,
		.08
	], [
		hx,
		.95,
		-.5800000000000001
	], PALETTE.blue);
	addBox(p, [
		1.3,
		.12,
		.5
	], [
		hx,
		.36,
		-.3500000000000001
	], PALETTE.grey);
	addBox(p, [
		1.1,
		.12,
		.3
	], [
		hx,
		.24,
		-.050000000000000044
	], PALETTE.grey);
	addBox(p, [
		1.6,
		.08,
		.9
	], [
		hx,
		1.85,
		-.1499999999999999
	], PALETTE.roof);
	for (const sx of [-.7, .7]) addBox(p, [
		.08,
		1.5,
		.08
	], [
		hx + sx,
		1.1,
		.20000000000000018
	], PALETTE.white);
	for (const [wx, wy] of [
		[-1.3, 1.2],
		[1.3, 1.2],
		[-1, 2.8],
		[1, 2.8]
	]) {
		addBox(p, [
			.75,
			.75,
			.06
		], [
			hx + wx,
			wy,
			-.5800000000000001
		], PALETTE.white);
		addBox(p, [
			.58,
			.58,
			.08
		], [
			hx + wx,
			wy,
			-.5700000000000001
		], "#cfe6f2", {
			emissive: "#bfe3f0",
			emissiveIntensity: .25
		});
	}
	for (let i = -8; i <= 8; i++) {
		if (Math.abs(i) <= 1) continue;
		addBox(p, [
			.12,
			.6,
			.06
		], [
			i * .32,
			.6,
			4.2
		], PALETTE.white);
	}
	for (const side of [-1, 1]) {
		addBox(p, [
			2.3,
			.07,
			.05
		], [
			side * 1.6,
			.5,
			4.18
		], PALETTE.white);
		addBox(p, [
			2.3,
			.07,
			.05
		], [
			side * 1.6,
			.75,
			4.18
		], PALETTE.white);
	}
	addBox(p, [
		.08,
		1,
		.08
	], [
		1,
		.8,
		4.6
	], PALETTE.wood);
	addBox(p, [
		.3,
		.3,
		.5
	], [
		1,
		1.35,
		4.6
	], PALETTE.blue);
	addBox(p, [
		.03,
		.3,
		.08
	], [
		1.17,
		1.55,
		4.5
	], PALETTE.red);
	addRoundTree(p, 3.3, -1.5);
	const fx = -2.3, sx = 2.1, fz = 2.2;
	const dad = addPerson(p, {
		height: 1.85,
		shirt: PALETTE.blue,
		pants: "#3a3f4a",
		hat: PALETTE.red,
		pose: "throw"
	});
	dad.position.set(fx, .3, fz);
	dad.rotation.y = Math.PI / 2;
	const son = addPerson(p, {
		height: 1.15,
		shirt: PALETTE.red,
		pants: "#3b5c8f",
		hat: PALETTE.blue,
		pose: "bat"
	});
	son.position.set(sx, .3, fz);
	son.rotation.y = -Math.PI / 2;
	addCylinder(son, .03, .75, [
		.32,
		.95,
		.45
	], PALETTE.wood, {
		rotation: [
			1.1,
			0,
			0
		],
		segments: 6
	});
	const ball = addSphere(p, .09, [
		fx,
		2,
		fz
	], PALETTE.white, { detail: 1 });
	return { update(t) {
		const phase = t % 4 / 2;
		const u = phase < 1 ? phase : 2 - phase;
		ball.position.x = -1.9 + (4.4 - .8) * u;
		ball.position.y = 1.9 + Math.sin(Math.PI * u) * 1.8;
	} };
}
function buildUmbrella(p) {
	addCylinder(p, 5.5, .25, [
		0,
		.12,
		0
	], PALETTE.grassDark, {
		segments: 16,
		radiusTop: .97
	});
	addDisc(p, 2.6, [
		0,
		.26,
		0
	], "#a5c97a", { segments: 16 });
	for (const [x, z, r] of [
		[
			-3.4,
			1.5,
			.8
		],
		[
			3.2,
			2.4,
			1
		],
		[
			2.8,
			-2.6,
			.7
		],
		[
			-2.6,
			-3,
			.6
		],
		[
			.4,
			4.1,
			.6
		]
	]) addDisc(p, r, [
		x,
		.255,
		z
	], PALETTE.puddle, { segments: 10 });
	const canopyR = 2.7;
	const wedges = 10;
	for (let i = 0; i < wedges; i++) {
		const g = new THREE.SphereGeometry(canopyR, 2, 4, i / wedges * Math.PI * 2, Math.PI * 2 / wedges, 0, Math.PI / 2);
		g.scale(1, .45, 1);
		const m = new THREE.Mesh(g, mat(i % 2 ? PALETTE.cream : PALETTE.red));
		m.material.side = THREE.FrontSide;
		m.position.y = 3.3;
		m.castShadow = true;
		p.add(m);
	}
	addCylinder(p, .06, 3.9, [
		0,
		2.15,
		0
	], PALETTE.wood, { segments: 6 });
	addSphere(p, .1, [
		0,
		4.55,
		0
	], PALETTE.wood, { detail: 0 });
	addBox(p, [
		2.2,
		.1,
		.6
	], [
		0,
		.72,
		-.2
	], PALETTE.wood);
	addBox(p, [
		2.2,
		.5,
		.08
	], [
		0,
		1.05,
		-.5
	], PALETTE.wood);
	for (const sx of [-.95, .95]) addBox(p, [
		.1,
		.5,
		.5
	], [
		sx,
		.5,
		-.2
	], PALETTE.darkGrey);
	addPerson(p, {
		height: 1.7,
		shirt: "#6b7fa8",
		pants: "#4a4640",
		hair: PALETTE.hair,
		seated: true
	}).position.set(-.45, .32, -.25);
	addPerson(p, {
		height: 1.6,
		shirt: "#c7768a",
		pants: "#4a4640",
		hair: PALETTE.hair,
		seated: true
	}).position.set(.45, .32, -.25);
	addBox(p, [
		1.8,
		.08,
		.6
	], [
		0,
		.85,
		.05
	], PALETTE.accent);
	addBox(p, [
		1.8,
		.4,
		.06
	], [
		0,
		.66,
		.35
	], PALETTE.accent);
	for (const [x, y, z, r] of [
		[
			0,
			8,
			0,
			1.8
		],
		[
			1.7,
			7.8,
			.3,
			1.4
		],
		[
			-1.7,
			7.9,
			-.2,
			1.5
		],
		[
			.6,
			8.4,
			-.8,
			1.3
		],
		[
			-.8,
			7.7,
			1,
			1.2
		]
	]) addSphere(p, [
		r,
		r * .6,
		r
	], [
		x,
		y,
		z
	], "#8a9099", { castShadow: false });
	const COUNT = 120;
	const drops = new THREE.InstancedMesh(new THREE.BoxGeometry(.03, .35, .03), mat("#7f97ad"), COUNT);
	const ang = new Float32Array(COUNT), rad = new Float32Array(COUNT), yy = new Float32Array(COUNT), spd = new Float32Array(COUNT);
	let seed = 7;
	const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
	for (let i = 0; i < COUNT; i++) {
		ang[i] = rnd() * Math.PI * 2;
		rad[i] = 3.0500000000000003 + rnd() * 2.0999999999999996;
		yy[i] = rnd() * 7.5;
		spd[i] = 7 + rnd() * 3;
	}
	p.add(drops);
	const d = new THREE.Object3D();
	return { update(_t, dt) {
		for (let i = 0; i < COUNT; i++) {
			yy[i] -= spd[i] * dt;
			if (yy[i] < .3) yy[i] = 7.4;
			d.position.set(Math.cos(ang[i]) * rad[i], yy[i], Math.sin(ang[i]) * rad[i]);
			d.updateMatrix();
			drops.setMatrixAt(i, d.matrix);
		}
		drops.instanceMatrix.needsUpdate = true;
	} };
}
function buildCamper(p) {
	addCylinder(p, 5.5, .25, [
		0,
		.12,
		0
	], PALETTE.grass, {
		segments: 16,
		radiusTop: .97
	});
	addDisc(p, 2.6, [
		.5,
		.26,
		-2.6
	], PALETTE.water, {
		segments: 16,
		emissive: "#3f78c4",
		emissiveIntensity: .25
	});
	addCone(p, 2.6, 5, [
		-2.2,
		2.5,
		-5.2
	], "#8aa0a8", { segments: 6 });
	addCone(p, 3.2, 6.5, [
		1.2,
		3.25,
		-6
	], "#7d929b", { segments: 6 });
	addCone(p, 2.2, 4, [
		4,
		2,
		-5
	], "#93a8ae", { segments: 6 });
	const v = new THREE.Group();
	v.position.set(-1.2, .25, 1.4);
	v.rotation.y = .25;
	p.add(v);
	addBox(v, [
		3.2,
		1.6,
		1.6
	], [
		-.3,
		1.25,
		0
	], PALETTE.mint);
	addBox(v, [
		3.2,
		.5,
		1.62
	], [
		-.3,
		.65,
		0
	], PALETTE.white);
	addBox(v, [
		3.22,
		.12,
		1.64
	], [
		-.3,
		1,
		0
	], PALETTE.accent);
	addBox(v, [
		1.1,
		1.1,
		1.6
	], [
		1.85,
		.95,
		0
	], PALETTE.mint);
	addBox(v, [
		.4,
		.9,
		1.5
	], [
		1.45,
		1.85,
		0
	], PALETTE.mint, { rotation: [
		0,
		0,
		-.4
	] });
	addBox(v, [
		.06,
		.6,
		1.3
	], [
		2.42,
		1.3,
		0
	], "#2e4a7a", { rotation: [
		0,
		0,
		-.15
	] });
	for (const wx of [-1.3, -.2]) addBox(v, [
		.7,
		.5,
		1.64
	], [
		wx,
		1.55,
		0
	], "#2e4a7a");
	for (const z of [-.45, .45]) addBox(v, [
		.05,
		.15,
		.2
	], [
		2.41,
		.75,
		z
	], "#fff6d0", {
		emissive: "#fff3c4",
		emissiveIntensity: .8
	});
	for (const wx of [-1.3, 1.6]) for (const wz of [-.8, .8]) {
		addCylinder(v, .35, .25, [
			wx,
			.35,
			wz
		], PALETTE.ink, {
			rotation: [
				Math.PI / 2,
				0,
				0
			],
			segments: 10
		});
		addCylinder(v, .15, .27, [
			wx,
			.35,
			wz
		], PALETTE.grey, {
			rotation: [
				Math.PI / 2,
				0,
				0
			],
			segments: 8
		});
	}
	for (let i = 0; i < 6; i++) addBox(v, [
		.4,
		.06,
		1.4
	], [
		-1.7 + i * .4 + .2,
		2,
		-1.5
	], i % 2 ? PALETTE.cream : PALETTE.accent, { rotation: [
		-.2,
		0,
		0
	] });
	for (const wx of [-1.6, .6]) addCylinder(v, .03, 1.9, [
		wx,
		1,
		-2.15
	], PALETTE.grey, { segments: 5 });
	for (const [cx, shirt] of [[-.6, PALETTE.blue], [1.1, PALETTE.red]]) {
		const ch = new THREE.Group();
		ch.position.set(cx, .25, -.3);
		ch.rotation.y = Math.PI;
		p.add(ch);
		addBox(ch, [
			.6,
			.06,
			.55
		], [
			0,
			.42,
			.1
		], PALETTE.accent);
		addBox(ch, [
			.6,
			.6,
			.05
		], [
			0,
			.72,
			-.18
		], PALETTE.accent, { rotation: [
			-.2,
			0,
			0
		] });
		for (const lx of [-.27, .27]) addBox(ch, [
			.04,
			.45,
			.04
		], [
			lx,
			.2,
			.1
		], PALETTE.darkGrey, { rotation: [
			.4,
			0,
			0
		] });
		addPerson(ch, {
			height: 1.7,
			shirt,
			hair: PALETTE.hair,
			seated: true
		}).position.set(0, 0, 0);
	}
	const fx = 2.6, fz = 1;
	for (let i = 0; i < 8; i++) {
		const a = i / 8 * Math.PI * 2;
		addSphere(p, .16, [
			fx + Math.cos(a) * .55,
			.32,
			fz + Math.sin(a) * .55
		], PALETTE.grey, { detail: 0 });
	}
	for (let i = 0; i < 3; i++) addCylinder(p, .07, .8, [
		fx,
		.35,
		fz
	], PALETTE.wood, {
		rotation: [
			Math.PI / 2,
			i * Math.PI / 3,
			.2
		],
		segments: 6
	});
	const f1 = addCone(p, .35, .8, [
		fx,
		.7,
		fz
	], PALETTE.accent, {
		emissive: "#f28a1a",
		emissiveIntensity: 1.2,
		castShadow: false
	});
	const f2 = addCone(p, .2, .55, [
		fx,
		.75,
		fz
	], "#ffd86b", {
		emissive: "#ffd04a",
		emissiveIntensity: 1.4,
		castShadow: false
	});
	addPine(p, -4.2, -1.8, 1.1);
	addPine(p, -3.9, 2.8, .9);
	addPine(p, 4.3, -2, 1.2);
	addPine(p, 4.4, 2.8, .8);
	return { update(t) {
		const a = 1 + Math.sin(t * 13) * .12 + Math.sin(t * 7.3) * .08;
		const b = 1 + Math.sin(t * 17 + 1) * .15;
		f1.scale.set(.35 * b, .8 * a, .35 * b);
		f2.scale.set(.2 * a, .55 * b, .2 * a);
	} };
}
//#endregion
//#region src/exhibition/sections.ts
var SECTIONS = [
	{
		id: "time-together",
		label: "Time together",
		title: "More time with the people you love.",
		description: "Pay ... $ a year and be ready for the day your career ends. Spend it where it matters: at home, with the people you love. That's what our retirement insurance is for.",
		build: buildBaseball
	},
	{
		id: "peace-of-mind",
		label: "Peace of mind",
		title: "Let the storm pass. You're covered.",
		description: "Life insurance that keeps your family protected, whatever tomorrow brings. For ... $ a month, the people you love never have to worry about the bills.",
		build: buildUmbrella
	},
	{
		id: "freedom",
		label: "Freedom",
		title: "Retire into your next adventure.",
		description: "The road doesn't end when the career does. Plan ahead with ... $ a year and be free to go wherever you've always wanted. No schedule, no worries.",
		build: buildCamper
	}
];
//#endregion
//#region src/exhibition/sign.ts
var FONT = `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
function wrapText(ctx, text, maxWidth) {
	const words = text.split(" ");
	const lines = [];
	let line = "";
	for (const w of words) {
		const test = line ? `${line} ${w}` : w;
		if (ctx.measureText(test).width > maxWidth && line) {
			lines.push(line);
			line = w;
		} else line = test;
	}
	if (line) lines.push(line);
	return lines;
}
function drawSignCanvas(title, description, maxAniso) {
	const W = 1536, H = 1152, pad = 110;
	const canvas = document.createElement("canvas");
	canvas.width = W;
	canvas.height = H;
	const ctx = canvas.getContext("2d");
	ctx.fillStyle = PALETTE.cream;
	ctx.fillRect(0, 0, W, H);
	ctx.fillStyle = PALETTE.accent;
	ctx.fillRect(pad, pad, 180, 18);
	ctx.fillStyle = PALETTE.ink;
	ctx.textBaseline = "top";
	let size = 112;
	let lines;
	do {
		ctx.font = `800 ${size}px ${FONT}`;
		lines = wrapText(ctx, title, 1316);
		size -= 6;
	} while (lines.length > 3 && size > 60);
	let y = 180;
	for (const l of lines) {
		ctx.fillText(l, pad, y);
		y += size * 1.18;
	}
	y += 40;
	ctx.fillStyle = "#4a4640";
	ctx.font = `400 54px ${FONT}`;
	for (const l of wrapText(ctx, description, 1316)) {
		ctx.fillText(l, pad, y);
		y += 81;
	}
	const tex = new THREE.CanvasTexture(canvas);
	tex.colorSpace = THREE.SRGBColorSpace;
	tex.anisotropy = maxAniso;
	tex.generateMipmaps = true;
	tex.minFilter = THREE.LinearMipmapLinearFilter;
	return tex;
}
function buildSign(parent, title, description, maxAniso) {
	const { boardWidth: w, boardHeight: h } = SIGN_LAYOUT;
	const g = new THREE.Group();
	const bottom = .9;
	for (const sx of [-1, 1]) addBox(g, [
		.2,
		bottom + h * .6,
		.2
	], [
		sx * (w / 2 - .5),
		(bottom + h * .6) / 2,
		-.12
	], PALETTE.wood);
	addBox(g, [
		w + .3,
		h + .3,
		.16
	], [
		0,
		bottom + h / 2,
		0
	], PALETTE.wood);
	const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({
		map: drawSignCanvas(title, description, maxAniso),
		toneMapped: false
	}));
	face.position.set(0, bottom + h / 2, .085);
	g.add(face);
	g.position.set(SIGN_LAYOUT.x, 0, SIGN_LAYOUT.z);
	g.rotation.y = SIGN_LAYOUT.rotationY;
	parent.add(g);
	return g;
}
//#endregion
//#region src/exhibition/motion.ts
/** Advance one frame. input: -1, 0 or +1 from buttons/keys. Manual input cancels a glide. */
function stepMotion(s, input, dt) {
	if (input !== 0) s.glideTarget = null;
	if (s.glideTarget !== null) {
		const gap = s.glideTarget - s.progress;
		let want = gap * GLIDE_EASE;
		want = Math.max(-22, Math.min(22, want));
		s.speed += (want - s.speed) * (1 - Math.exp(-3 * dt));
		if (Math.abs(gap) < .02 && Math.abs(s.speed) < .1) {
			s.progress = s.glideTarget;
			s.speed = 0;
			s.glideTarget = null;
			return;
		}
	} else {
		const target = input * 8;
		s.speed += (target - s.speed) * (1 - Math.exp(-5 * dt));
		if (input === 0 && Math.abs(s.speed) < .001) s.speed = 0;
	}
	s.progress += s.speed * dt;
	if (s.progress < 0) {
		s.progress = 0;
		s.speed = Math.max(0, s.speed);
	}
	if (s.progress > MAX_PROGRESS) {
		s.progress = MAX_PROGRESS;
		s.speed = Math.min(0, s.speed);
	}
}
/** Index of the station within a third of the spacing, else -1. */
function nearestStation(progress, positions, spacing) {
	let best = -1, bestD = spacing / 3;
	positions.forEach((p, i) => {
		const d = Math.abs(progress - p);
		if (d <= bestD) {
			bestD = d;
			best = i;
		}
	});
	return best;
}
//#endregion
//#region src/exhibition/world.ts
var R = 150;
var World = class {
	canvas;
	cb;
	renderer;
	scene = new THREE.Scene();
	camera = new THREE.PerspectiveCamera(70, 1, NEAR, 300);
	planet = new THREE.Group();
	stations = [];
	motion = {
		progress: 0,
		speed: 0,
		glideTarget: null
	};
	input = 0;
	yawInput = 0;
	yaw = 0;
	pitch = 0;
	raf = 0;
	last = 0;
	time = 0;
	lastStation = -2;
	moved = false;
	constructor(canvas, cb) {
		this.canvas = canvas;
		this.cb = cb;
		this.renderer = new THREE.WebGLRenderer({
			canvas,
			antialias: true
		});
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		this.renderer.outputColorSpace = THREE.SRGBColorSpace;
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		this.scene.background = new THREE.Color(PALETTE.sky);
		this.scene.fog = new THREE.Fog(PALETTE.sky, 25, 90);
		this.camera.position.set(0, CAMERA_HEIGHT, 0);
		this.camera.rotation.order = "YXZ";
		this.scene.add(new THREE.HemisphereLight("#eaf6ff", "#5d7f4a", 1.6));
		const sun = new THREE.DirectionalLight("#fff4e0", 2.2);
		sun.position.set(18, 30, 12);
		sun.target.position.set(0, 0, -6);
		sun.castShadow = true;
		sun.shadow.mapSize.set(1024, 1024);
		const sc = sun.shadow.camera;
		sc.left = sc.bottom = -22;
		sc.right = sc.top = 22;
		sc.near = 1;
		sc.far = 90;
		sun.shadow.bias = -5e-4;
		sun.shadow.normalBias = .03;
		this.scene.add(sun, sun.target);
		this.planet.position.set(0, -R, 0);
		this.scene.add(this.planet);
		this.buildGround();
		this.buildRoad();
		this.buildProps();
		this.buildStations();
	}
	buildGround() {
		const g = new THREE.Mesh(new THREE.SphereGeometry(R, 64, 32), mat(PALETTE.grass));
		g.receiveShadow = true;
		this.planet.add(g);
	}
	/** Strip along the great circle, from distance d0 to d1, between x0 and x1, lifted h. */
	strip(d0, d1, x0, x1, h, color) {
		const steps = Math.ceil((d1 - d0) / 1.5);
		const pos = [];
		const idx = [];
		for (let i = 0; i <= steps; i++) {
			const phi = (d0 + (d1 - d0) * i / steps) / R;
			const rr = R + h;
			const y = rr * Math.cos(phi), z = -rr * Math.sin(phi);
			pos.push(x0, y, z, x1, y, z);
			if (i < steps) {
				const a = i * 2;
				idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
			}
		}
		const geo = new THREE.BufferGeometry();
		geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
		geo.setIndex(idx);
		geo.computeVertexNormals();
		const m = new THREE.Mesh(geo, mat(color));
		m.receiveShadow = true;
		this.planet.add(m);
	}
	buildRoad() {
		const w = ROAD_WIDTH / 2;
		const start = -25, end = MAX_PROGRESS + 6;
		this.strip(start, end, -w - .6, -w, .025, PALETTE.verge);
		this.strip(start, end, w, w + .6, .025, PALETTE.verge);
		this.strip(start, end, -w, w, .035, PALETTE.road);
		const n = Math.floor((end - start) / 4);
		const dashes = new THREE.InstancedMesh(new THREE.BoxGeometry(.15, .02, 1.8), mat(PALETTE.line), n);
		const o = new THREE.Object3D();
		for (let i = 0; i < n; i++) this.placeOnRoad(o, start + i * 4 + 1, 0, .04), dashes.setMatrixAt(i, o.matrix);
		dashes.receiveShadow = true;
		this.planet.add(dashes);
		const bar = new THREE.Group();
		const p = new THREE.Object3D();
		this.placeOnRoad(p, end - 1, 0, 0);
		bar.position.copy(p.position);
		bar.quaternion.copy(p.quaternion);
		const b = new THREE.Mesh(new THREE.BoxGeometry(ROAD_WIDTH + 1, .4, .2), mat(PALETTE.red));
		b.position.y = .8;
		b.castShadow = true;
		bar.add(b);
		for (const sx of [-1, 1]) {
			const post = new THREE.Mesh(new THREE.BoxGeometry(.2, 1, .2), mat(PALETTE.cream));
			post.position.set(sx * (ROAD_WIDTH / 2 + .3), .5, 0);
			bar.add(post);
		}
		this.planet.add(bar);
	}
	/** Put an object at distance d along the road, x to the side, h above ground (planet-local). */
	placeOnRoad(o, d, x, h) {
		const phi = d / R;
		o.position.set(x, (R + h) * Math.cos(phi), -(R + h) * Math.sin(phi));
		o.rotation.set(-phi, 0, 0);
		o.updateMatrix();
	}
	buildProps() {
		let seed = PROP_SEED;
		const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
		const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(.18, .22, 1.6, 6).translate(0, .8, 0), mat(PALETTE.wood), 60);
		const crown = new THREE.InstancedMesh(new THREE.ConeGeometry(1.1, 2.8, 7).translate(0, 2.8, 0), mat(PALETTE.leafDark), 60);
		const lampCount = Math.floor((MAX_PROGRESS + 20) / 30);
		const pole = new THREE.InstancedMesh(new THREE.CylinderGeometry(.06, .08, 3.6, 6).translate(0, 1.8, 0), mat(PALETTE.darkGrey), lampCount);
		const lampHead = new THREE.InstancedMesh(new THREE.BoxGeometry(.4, .25, .4).translate(0, 3.7, 0), mat(PALETTE.cream, "#fff1c9", .4), lampCount);
		const o = new THREE.Object3D();
		let placed = 0;
		for (let i = 0; i < 180 && placed < 60; i++) {
			const d = -20 + rnd() * (MAX_PROGRESS + 30);
			const x = (placed % 2 ? 1 : -1) * (ROAD_WIDTH / 2 + 3 + rnd() * 9);
			if (STATION_POSITIONS.some((s) => Math.abs(d - s) < 13 && Math.abs(x) < 16)) continue;
			this.placeOnRoad(o, d, x, 0);
			const s = .8 + rnd() * .6;
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
			if (STATION_POSITIONS.some((s) => Math.abs(d - s) < 13)) d += 15;
			this.placeOnRoad(o, d, (i % 2 ? 1 : -1) * (ROAD_WIDTH / 2 + 1), 0);
			o.scale.setScalar(1);
			o.updateMatrix();
			pole.setMatrixAt(i, o.matrix);
			lampHead.setMatrixAt(i, o.matrix);
		}
		for (const m of [
			trunk,
			crown,
			pole,
			lampHead
		]) {
			m.castShadow = true;
			this.planet.add(m);
		}
	}
	buildStations() {
		const aniso = this.renderer.capabilities.getMaxAnisotropy();
		SECTIONS.forEach((sec, i) => {
			const s = STATION_POSITIONS[i];
			const pivot = new THREE.Group();
			pivot.rotation.x = -s / R;
			const group = new THREE.Group();
			group.position.set(0, R, 0);
			pivot.add(group);
			this.planet.add(pivot);
			buildSign(group, sec.title, sec.description, aniso);
			const sceneRoot = new THREE.Group();
			sceneRoot.position.set(SCENE_LAYOUT.x, 0, SCENE_LAYOUT.z);
			sceneRoot.rotation.y = SCENE_LAYOUT.rotationY;
			group.add(sceneRoot);
			const handle = sec.build(sceneRoot);
			this.stations.push({
				group,
				s,
				handle
			});
		});
	}
	look(dx, dy) {
		const inv = 1;
		this.yaw += dx * LOOK_SENSITIVITY * inv;
		this.pitch += dy * LOOK_SENSITIVITY * inv;
		this.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, this.pitch));
	}
	glideTo(index) {
		const s = STATION_POSITIONS[index];
		if (s === void 0) return;
		this.motion.glideTarget = s;
		this.markMoved();
	}
	markMoved() {
		if (!this.moved) {
			this.moved = true;
			this.cb.onFirstMove();
		}
	}
	resize() {
		const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
		this.renderer.setSize(w, h, false);
		this.camera.aspect = w / h;
		this.camera.updateProjectionMatrix();
	}
	start() {
		this.resize();
		const frame = (now) => {
			this.raf = requestAnimationFrame(frame);
			const dt = Math.min(this.last ? (now - this.last) / 1e3 : 0, MAX_DT);
			this.last = now;
			this.time += dt;
			if (this.input !== 0) this.markMoved();
			stepMotion(this.motion, this.input, dt);
			if (this.yawInput) this.yaw += this.yawInput * KEY_LOOK_SPEED * dt;
			this.planet.rotation.x = this.motion.progress / R;
			this.camera.rotation.set(this.pitch, this.yaw, 0);
			for (const st of this.stations) {
				const vis = Math.abs(this.motion.progress - st.s) < 80;
				st.group.visible = vis;
				if (vis && st.handle && st.handle.update) st.handle.update(this.time, dt);
			}
			const near = nearestStation(this.motion.progress, STATION_POSITIONS, 90);
			if (near !== this.lastStation) {
				this.lastStation = near;
				this.cb.onStation(near);
			}
			this.renderer.render(this.scene, this.camera);
			this.canvas.parentElement?.setAttribute("data-scene-ready", "true");
		};
		this.raf = requestAnimationFrame(frame);
	}
	dispose() {
		cancelAnimationFrame(this.raf);
		this.renderer.dispose();
	}
};
//#endregion
//#region src/components/ExhibitionRoad.tsx
function ExhibitionRoad() {
	const wrapRef = useRef(null);
	const canvasRef = useRef(null);
	const worldRef = useRef(null);
	const [station, setStation] = useState(-1);
	const [hintGone, setHintGone] = useState(false);
	useEffect(() => {
		const canvas = canvasRef.current;
		const world = new World(canvas, {
			onStation: setStation,
			onFirstMove: () => setHintGone(true)
		});
		worldRef.current = world;
		world.start();
		const onResize = () => world.resize();
		window.addEventListener("resize", onResize);
		let lookId = null;
		let lx = 0, ly = 0;
		const down = (e) => {
			if (lookId !== null) return;
			lookId = e.pointerId;
			lx = e.clientX;
			ly = e.clientY;
			canvas.setPointerCapture(e.pointerId);
		};
		const move = (e) => {
			if (e.pointerId !== lookId) return;
			world.look(e.clientX - lx, e.clientY - ly);
			lx = e.clientX;
			ly = e.clientY;
			world.markMoved();
		};
		const up = (e) => {
			if (e.pointerId === lookId) lookId = null;
		};
		canvas.addEventListener("pointerdown", down);
		canvas.addEventListener("pointermove", move);
		canvas.addEventListener("pointerup", up);
		canvas.addEventListener("pointercancel", up);
		const keys = /* @__PURE__ */ new Set();
		const sync = () => {
			world.input = (keys.has("f") ? 1 : 0) - (keys.has("b") ? 1 : 0);
			world.yawInput = (keys.has("l") ? 1 : 0) - (keys.has("r") ? 1 : 0);
		};
		const map = {
			ArrowUp: "f",
			KeyW: "f",
			ArrowDown: "b",
			KeyS: "b",
			ArrowLeft: "l",
			KeyA: "l",
			ArrowRight: "r",
			KeyD: "r"
		};
		const kd = (e) => {
			const k = map[e.code];
			if (k) {
				e.preventDefault();
				keys.add(k);
				sync();
				world.markMoved();
			}
		};
		const ku = (e) => {
			const k = map[e.code];
			if (k) {
				keys.delete(k);
				sync();
			}
		};
		const blur = () => {
			keys.clear();
			sync();
		};
		window.addEventListener("keydown", kd);
		window.addEventListener("keyup", ku);
		window.addEventListener("blur", blur);
		window.__game = world;
		return () => {
			window.removeEventListener("resize", onResize);
			window.removeEventListener("keydown", kd);
			window.removeEventListener("keyup", ku);
			window.removeEventListener("blur", blur);
			world.dispose();
		};
	}, []);
	const holdProps = (dir) => ({
		onPointerDown: (e) => {
			e.currentTarget.setPointerCapture(e.pointerId);
			if (worldRef.current) worldRef.current.input = dir;
		},
		onPointerUp: () => {
			if (worldRef.current) worldRef.current.input = 0;
		},
		onPointerCancel: () => {
			if (worldRef.current) worldRef.current.input = 0;
		},
		onLostPointerCapture: () => {
			if (worldRef.current) worldRef.current.input = 0;
		},
		onContextMenu: (e) => e.preventDefault()
	});
	return /* @__PURE__ */ jsxs("div", {
		ref: wrapRef,
		className: "exhibit-root relative h-dvh w-full overflow-hidden bg-sky",
		children: [
			/* @__PURE__ */ jsx("canvas", {
				ref: canvasRef,
				className: "block h-full w-full",
				style: { touchAction: "none" },
				onContextMenu: (e) => e.preventDefault(),
				"aria-hidden": "true"
			}),
			/* @__PURE__ */ jsx("nav", {
				"aria-label": "Stations",
				className: "absolute inset-x-0 top-0 flex justify-center",
				style: { paddingTop: "max(14px, env(safe-area-inset-top))" },
				children: /* @__PURE__ */ jsx("div", {
					className: "flex items-center gap-1 rounded-full bg-card/80 px-2 py-1.5 shadow-hud backdrop-blur-sm",
					children: SECTIONS.map((s, i) => /* @__PURE__ */ jsxs("button", {
						type: "button",
						onClick: () => worldRef.current?.glideTo(i),
						"aria-label": `Go to station ${i + 1}: ${s.label}`,
						"aria-current": station === i ? "step" : void 0,
						className: "group flex items-center gap-2 rounded-full px-2.5 py-1.5 transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-ring",
						children: [/* @__PURE__ */ jsx("span", { className: `block h-2.5 w-2.5 rounded-full transition-all duration-300 ${station === i ? "scale-125 bg-primary" : "bg-muted-foreground/40 group-hover:bg-muted-foreground/70"}` }), /* @__PURE__ */ jsx("span", {
							className: `hidden text-xs font-semibold sm:inline ${station === i ? "text-foreground" : "text-muted-foreground"}`,
							children: s.label
						})]
					}, s.id))
				})
			}),
			/* @__PURE__ */ jsx("p", {
				"aria-hidden": "true",
				className: `pointer-events-none absolute bottom-0 rounded-2xl bg-card/85 px-4 py-2 text-center text-sm font-medium text-foreground shadow-hud transition-opacity duration-700 ${hintGone ? "opacity-0" : "opacity-100"}`,
				style: {
					left: "max(16px, env(safe-area-inset-left))",
					right: "calc(max(18px, env(safe-area-inset-right)) + 92px)",
					marginBottom: "max(28px, calc(env(safe-area-inset-bottom) + 20px))",
					maxWidth: 360
				},
				children: "Hold the arrows to move. Drag to look around."
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "absolute flex flex-col gap-3",
				style: {
					right: "max(18px, env(safe-area-inset-right))",
					bottom: "max(22px, env(safe-area-inset-bottom))"
				},
				children: [/* @__PURE__ */ jsx("button", {
					type: "button",
					"aria-label": "Move forward",
					className: "road-btn",
					...holdProps(1),
					children: /* @__PURE__ */ jsx("svg", {
						viewBox: "0 0 24 24",
						className: "h-8 w-8",
						"aria-hidden": "true",
						children: /* @__PURE__ */ jsx("path", {
							d: "M12 5l7 8h-4.5v6h-5v-6H5z",
							fill: "currentColor"
						})
					})
				}), /* @__PURE__ */ jsx("button", {
					type: "button",
					"aria-label": "Move backward",
					className: "road-btn",
					...holdProps(-1),
					children: /* @__PURE__ */ jsx("svg", {
						viewBox: "0 0 24 24",
						className: "h-8 w-8 rotate-180",
						"aria-hidden": "true",
						children: /* @__PURE__ */ jsx("path", {
							d: "M12 5l7 8h-4.5v6h-5v-6H5z",
							fill: "currentColor"
						})
					})
				})]
			}),
			/* @__PURE__ */ jsxs("main", {
				className: "sr-only",
				children: [/* @__PURE__ */ jsx("h1", { children: "Exhibition Road" }), SECTIONS.map((s) => /* @__PURE__ */ jsxs("section", {
					"aria-labelledby": `t-${s.id}`,
					children: [/* @__PURE__ */ jsx("h2", {
						id: `t-${s.id}`,
						children: s.title
					}), /* @__PURE__ */ jsx("p", { children: s.description })]
				}, s.id))]
			})
		]
	});
}
//#endregion
//#region src/routes/index.tsx?tsr-split=component
var SplitComponent = ExhibitionRoad;
//#endregion
export { SplitComponent as component };
