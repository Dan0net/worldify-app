import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import UI from "./ui/UI.tsx";
import { Worldify } from "./3d/Worldify.ts";
import {
  arrayToBase64,
  base64ToUint16Array,
  compressFloat32ArrayToUint8,
  packGridArray,
  unpackGridArray,
} from "./utils/functions.ts";
import GUI from "three/examples/jsm/libs/lil-gui.module.min.js";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <UI />
  </StrictMode>
);

new Worldify();
// Init gui

// const weights = new Float32Array([-0.5, -0.47, 0.4]);
// const materials = new Uint8Array([85, 60, 100]);
// const lights = new Uint8Array([9, 15, 7]);

// console.log(weights)
// console.log(materials)
// console.log(lights)

// const _weights = compressFloat32ArrayToUint8(weights,-0.5,0.5,5)
// console.log(_weights)
// const grid = packGridArray(_weights, materials, lights)
// const base64 = arrayToBase64(grid)

// const __grid = base64ToUint16Array(base64)

// const _grid = unpackGridArray(__grid)

// console.log(_grid.weights)
// console.log(_grid.materials)
// console.log(_grid.lights)
