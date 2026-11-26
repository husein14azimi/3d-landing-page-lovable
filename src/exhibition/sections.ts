// ===== SECTIONS =====
// To add a station: write a build function in scenes.ts and add an entry here
// (then bump STATION_COUNT in config.ts).
import type * as THREE from "three";
import { buildBaseball, buildCamper, buildUmbrella, type SceneHandle } from "./scenes";

export interface Section {
  id: string;
  label: string;
  title: string;
  description: string;
  build: (parent: THREE.Group) => SceneHandle | void;
}

export const SECTIONS: Section[] = [
  {
    id: "time-together",
    label: "Time together",
    title: "More time with the people you love.",
    description:
      "Pay ... $ a year and be ready for the day your career ends. Spend it where it matters: at home, with the people you love. That's what our retirement insurance is for.",
    build: buildBaseball,
  },
  {
    id: "peace-of-mind",
    label: "Peace of mind",
    title: "Let the storm pass. You're covered.",
    description:
      "Life insurance that keeps your family protected, whatever tomorrow brings. For ... $ a month, the people you love never have to worry about the bills.",
    build: buildUmbrella,
  },
  {
    id: "freedom",
    label: "Freedom",
    title: "Retire into your next adventure.",
    description:
      "The road doesn't end when the career does. Plan ahead with ... $ a year and be free to go wherever you've always wanted. No schedule, no worries.",
    build: buildCamper,
  },
];
