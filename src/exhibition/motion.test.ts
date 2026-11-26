import { describe, expect, it } from "vitest";
import { MAX_PROGRESS, MAX_SPEED, STATION_POSITIONS, STATION_SPACING } from "./config";
import { nearestStation, stepMotion, type MotionState } from "./motion";

const run = (s: MotionState, input: number, secs: number) => { for (let t = 0; t < secs; t += 1 / 60) stepMotion(s, input, 1 / 60); };

describe("motion", () => {
  it("stations sit at 60, 150, 240 and the road ends at 280", () => {
    expect(STATION_POSITIONS).toEqual([60, 150, 240]);
    expect(MAX_PROGRESS).toBe(280);
  });
  it("holding forward eases up to 8 units/s", () => {
    const s = { progress: 0, speed: 0, glideTarget: null };
    run(s, 1, 3);
    expect(s.speed).toBeCloseTo(MAX_SPEED, 1);
  });
  it("clamps at both ends", () => {
    const s = { progress: 5, speed: 0, glideTarget: null };
    run(s, -1, 5);
    expect(s.progress).toBe(0);
    const e = { progress: 275, speed: 0, glideTarget: null };
    run(e, 1, 5);
    expect(e.progress).toBe(280);
  });
  it("gliding to a station lands exactly on it", () => {
    const s: MotionState = { progress: 0, speed: 0, glideTarget: 240 };
    run(s, 0, 30);
    expect(s.progress).toBe(240);
    expect(s.glideTarget).toBeNull();
  });
  it("pressing a control cancels a glide", () => {
    const s: MotionState = { progress: 0, speed: 0, glideTarget: 240 };
    run(s, 0, 1);
    stepMotion(s, -1, 1 / 60);
    expect(s.glideTarget).toBeNull();
  });
  it("lights a dot only within a third of the spacing", () => {
    expect(nearestStation(150 + 29, STATION_POSITIONS, STATION_SPACING)).toBe(1);
    expect(nearestStation(150 + 31, STATION_POSITIONS, STATION_SPACING)).toBe(-1);
  });
});
