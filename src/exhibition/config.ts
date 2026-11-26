// ===== CONFIG =====
// Every tunable number lives here. Change a value, reload, done.
export const PLANET_RADIUS = 150;
export const FIRST_STATION = 60;
export const STATION_SPACING = 90;
export const ROAD_END_EXTRA = 40;
export const STATION_COUNT = 3;
export const STATION_POSITIONS = Array.from({ length: STATION_COUNT }, (_, i) => FIRST_STATION + i * STATION_SPACING);
export const MAX_PROGRESS = STATION_POSITIONS[STATION_COUNT - 1]! + ROAD_END_EXTRA;

export const MAX_SPEED = 8; // units / second while a button is held
export const SPEED_EASE = 5; // exponential easing rate (per second)
export const GLIDE_MAX_SPEED = 22; // top speed when gliding to a station from the dots
export const GLIDE_EASE = 1.6; // how quickly a glide closes the gap (per second)
export const MAX_DT = 0.05;

export const CAMERA_HEIGHT = 1.7;
export const FOV = 70;
export const NEAR = 0.05;
export const FAR = 300;
export const LOOK_SENSITIVITY = 0.005; // radians per pixel
export const KEY_LOOK_SPEED = 1.6; // radians per second for arrow-left/right
export const INVERT_LOOK = false;
export const MAX_PITCH = (89 * Math.PI) / 180;

export const FOG_NEAR = 25;
export const FOG_FAR = 90;
export const STATION_VISIBLE_DISTANCE = 80;
export const ENABLE_SHADOWS = true;

export const ROAD_WIDTH = 4.2;
export const PROP_COUNT = 60;
export const PROP_SEED = 1337;

export const PALETTE = {
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
  hair: "#d9d6cf",
};

export const SIGN_LAYOUT = { x: -4.5, z: -2, rotationY: 0.45, boardWidth: 5, boardHeight: 3.75 };
export const SCENE_LAYOUT = { x: 7.0, z: -2, rotationY: -0.45 };
