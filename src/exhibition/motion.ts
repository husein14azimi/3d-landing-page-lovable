// Pure movement rules (no three.js) so they can be unit-tested.
import { GLIDE_EASE, GLIDE_MAX_SPEED, MAX_PROGRESS, MAX_SPEED, SPEED_EASE } from "./config";

export interface MotionState {
  progress: number;
  speed: number;
  glideTarget: number | null;
}

/** Advance one frame. input: -1, 0 or +1 from buttons/keys. Manual input cancels a glide. */
export function stepMotion(s: MotionState, input: number, dt: number) {
  if (input !== 0) s.glideTarget = null;
  if (s.glideTarget !== null) {
    const gap = s.glideTarget - s.progress;
    // Desired speed shrinks as we approach, giving a smooth ease-out; capped for ease-in via speed easing.
    let want = gap * GLIDE_EASE;
    want = Math.max(-GLIDE_MAX_SPEED, Math.min(GLIDE_MAX_SPEED, want));
    s.speed += (want - s.speed) * (1 - Math.exp(-SPEED_EASE * 0.6 * dt));
    if (Math.abs(gap) < 0.02 && Math.abs(s.speed) < 0.1) {
      s.progress = s.glideTarget;
      s.speed = 0;
      s.glideTarget = null;
      return;
    }
  } else {
    const target = input * MAX_SPEED;
    s.speed += (target - s.speed) * (1 - Math.exp(-SPEED_EASE * dt));
    if (input === 0 && Math.abs(s.speed) < 0.001) s.speed = 0;
  }
  s.progress += s.speed * dt;
  if (s.progress < 0) { s.progress = 0; s.speed = Math.max(0, s.speed); }
  if (s.progress > MAX_PROGRESS) { s.progress = MAX_PROGRESS; s.speed = Math.min(0, s.speed); }
}

/** Index of the station within a third of the spacing, else -1. */
export function nearestStation(progress: number, positions: number[], spacing: number) {
  let best = -1, bestD = spacing / 3;
  positions.forEach((p, i) => {
    const d = Math.abs(progress - p);
    if (d <= bestD) { bestD = d; best = i; }
  });
  return best;
}
