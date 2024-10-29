// builder/BuildPresets.ts
import { Euler, Vector3 } from "three";
import { BuildShape } from "./BuildShape";

// export type BuildShape = ["cube", "sphere", "cylinder"];

// export type BuildSnapShape = ["plane", "cube", "point", "line"];

export interface BuildPreset {
  name: string;
  shape: string;
  snapShape: string;
  constructive: boolean;
  size: Vector3;
  material?: string;
  align: string;
  rotation?: Euler;
}

export const BuildPresets: BuildPreset[] = [
  {
    name: "wall",
    shape: "cube",
    snapShape: 'plane',
    constructive: true,
    size: new Vector3(4, 4, 0.5),
    material: 'brick',
    align: "base",
  },
  {
    name: "blob carve",
    shape: "sphere",
    snapShape: 'point',
    constructive: false,
    size: new Vector3(3, 0, 0),
    align: "center",
  },
  {
    name: "blob",
    shape: "sphere",
    snapShape: 'point',
    constructive: true,
    size: new Vector3(3, 0, 0),
    material: 'grass',
    align: "center",
  },
];
