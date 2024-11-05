// material/TerrainPallet.ts

import GUI from "three/examples/jsm/libs/lil-gui.module.min.js";

let gui: GUI;

export function getGUI(): GUI {
  if (!gui) {
    gui = new GUI();
  }
  return gui;
}
