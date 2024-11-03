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
  snap: boolean;
  size: Vector3;
  material: number;
  align: string;
  rotation: Euler;
}

export const BuildPresets: BuildPreset[] = [
  {
    name: "none",
    shape: "none",
    snapShape: "none",
    constructive: false,
    snap: false,
    size: new Vector3(),
    material: 0,
    align: "base",
    rotation: new Euler(0, 0, 0, "XYZ"),
  },
  {
    name: "wall",
    shape: "cube",
    snapShape: "plane",
    constructive: true,
    snap: true,
    size: new Vector3(4, 4, 1),
    material: 0,
    align: "base",
    rotation: new Euler(0, 0, 0, "XYZ"),
  },
  {
    name: "wall thin",
    shape: "cube",
    snapShape: "plane",
    constructive: true,
    snap: true,
    size: new Vector3(4, 4, 0.65),
    material: 0,
    align: "base",
    rotation: new Euler(0, 0, 0, "XYZ"),
  },
  {
    name: "blob carve",
    shape: "sphere",
    snapShape: "point",
    constructive: false,
    snap: false,
    size: new Vector3(1.5, 0, 0),
    material: 1,
    align: "center",
    rotation: new Euler(0, 0, 0, "XYZ"),
  },
  {
    name: "blob",
    shape: "sphere",
    snapShape: "point",
    constructive: true,
    snap: false,
    size: new Vector3(1.5, 0, 0),
    material: 1,
    align: "center",
    rotation: new Euler(0, 0, 0, "XYZ"),
  },
  {
    name: "slope",
    shape: "cube",
    snapShape: "plane",
    constructive: true,
    snap: true,
    size: new Vector3(4, 4, 1),
    material: 0,
    align: "base",
    rotation: new Euler(Math.PI / 3, 0, 0, "XYZ"),
  },
  {
    name: "floor",
    shape: "cube",
    snapShape: "plane",
    constructive: true,
    snap: true,
    size: new Vector3(4, 4, 1),
    material: 0,
    align: "base",
    rotation: new Euler(Math.PI / 2, 0, 0, "XYZ"),
  },
  {
    name: "floor thin",
    shape: "cube",
    snapShape: "plane",
    constructive: true,
    snap: true,
    size: new Vector3(4, 4, 0.65),
    material: 0,
    align: "base",
    rotation: new Euler(Math.PI / 2, 0, 0, "XYZ"),
  },
  {
    name: "pilar",
    shape: "cube",
    snap: true,
    snapShape: "line",
    constructive: true,
    size: new Vector3(1, 4, 1),
    material: 0,
    align: "base",
    rotation: new Euler(0, 0, 0, "XYZ"),
  },
  {
    name: "pilar thin",
    shape: "cube",
    snap: true,
    snapShape: "line",
    constructive: true,
    size: new Vector3(0.65, 4, 0.65),
    material: 0,
    align: "base",
    rotation: new Euler(0, 0, 0, "XYZ"),
  },{
    name: "beam",
    shape: "cube",
    snap: true,
    snapShape: "line",
    constructive: true,
    size: new Vector3(1, 4, 1),
    material: 0,
    align: "base",
    rotation: new Euler(Math.PI / 2, 0, 0, "XYZ"),
  },
  {
    name: "beam thin",
    shape: "cube",
    snap: true,
    snapShape: "line",
    constructive: true,
    size: new Vector3(0.65, 4, 0.65),
    material: 0,
    align: "base",
    rotation: new Euler(Math.PI / 2, 0, 0, "XYZ"),
  },{
    name: "block carve",
    shape: "cube",
    snap: true,
    snapShape: "cube",
    constructive: false,
    size: new Vector3(2, 3, 4),
    material: 0,
    align: "base",
    rotation: new Euler(0, 0, 0, "XYZ"),
  },
  {
    name: "window carve",
    shape: "cube",
    snap: true,
    snapShape: "cube",
    constructive: false,
    size: new Vector3(1, 1, 4),
    material: 0,
    align: "center",
    rotation: new Euler(0, 0, 0, "XYZ"),
  },
];
