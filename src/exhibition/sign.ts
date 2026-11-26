// ===== SIGNS =====
// A wooden sign: two posts, a thick board, and a crisp canvas-texture face.
import * as THREE from "three";
import { PALETTE, SIGN_LAYOUT } from "./config";
import { addBox } from "./primitives";

const FONT = `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;

// Split text into lines that fit maxWidth.
export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(" ");
  const lines: string[] = [];
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

function drawSignCanvas(title: string, description: string, maxAniso: number) {
  const W = 1536, H = 1152, pad = 110;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = PALETTE.cream;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = PALETTE.accent;
  ctx.fillRect(pad, pad, 180, 18);

  ctx.fillStyle = PALETTE.ink;
  ctx.textBaseline = "top";
  let size = 112;
  let lines: string[];
  do {
    ctx.font = `800 ${size}px ${FONT}`;
    lines = wrapText(ctx, title, W - pad * 2);
    size -= 6;
  } while (lines.length > 3 && size > 60);
  let y = pad + 70;
  for (const l of lines) {
    ctx.fillText(l, pad, y);
    y += size * 1.18;
  }
  y += 40;
  ctx.fillStyle = "#4a4640";
  ctx.font = `400 54px ${FONT}`;
  for (const l of wrapText(ctx, description, W - pad * 2)) {
    ctx.fillText(l, pad, y);
    y += 54 * 1.5;
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}

export function buildSign(parent: THREE.Object3D, title: string, description: string, maxAniso: number) {
  const { boardWidth: w, boardHeight: h } = SIGN_LAYOUT;
  const g = new THREE.Group();
  const bottom = 0.9;
  for (const sx of [-1, 1]) addBox(g, [0.2, bottom + h * 0.6, 0.2], [sx * (w / 2 - 0.5), (bottom + h * 0.6) / 2, -0.12], PALETTE.wood);
  addBox(g, [w + 0.3, h + 0.3, 0.16], [0, bottom + h / 2, 0], PALETTE.wood);
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: drawSignCanvas(title, description, maxAniso), toneMapped: false }),
  );
  face.position.set(0, bottom + h / 2, 0.085);
  g.add(face);
  g.position.set(SIGN_LAYOUT.x, 0, SIGN_LAYOUT.z);
  g.rotation.y = SIGN_LAYOUT.rotationY;
  parent.add(g);
  return g;
}
