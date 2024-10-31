import {
  Mesh,
  MeshBasicMaterial,
  Object3D,
  OctahedronGeometry,
  SphereGeometry,
  Vector3,
} from "three";
import { BuildPreset } from "./BuildPresets";
import { BUILD_SNAP_MARKER_SIZE, BUILD_SNAP_SIZE } from "../utils/constants";

export default class BuildSnapMarker extends Object3D {
  private markers: Mesh[] = [];
  private material = new MeshBasicMaterial({
    color: 0x0000ff,
    // wireframe: true,
    opacity: 0.5,
    transparent: true,
  });
  private geometry = new OctahedronGeometry(BUILD_SNAP_MARKER_SIZE, 0);
  private _pos = new Vector3();

  setBuildPresetConfig(buildPresetConfig: BuildPreset) {
    for (const marker of this.markers) {
      this.remove(marker);
    }
    this.markers = [];

    const s = buildPresetConfig.size.clone().multiplyScalar(0.5);
    let snaps;

    switch (buildPresetConfig.snapShape) {
      case "cube":
        snaps = [
          [s.x, s.y, s.z],
          [-s.x, s.y, s.z],
          [s.x, -s.y, s.z],
          [-s.x, -s.y, s.z],
          [s.x, s.y, -s.z],
          [-s.x, s.y, -s.z],
          [s.x, -s.y, -s.z],
          [-s.x, -s.y, -s.z],
        ];
        break;
      case "plane":
        snaps = [
          [s.x, s.y, 0],
          [-s.x, s.y, 0],
          [s.x, -s.y, 0],
          [-s.x, -s.y, 0],
        ];
        break;
      case "point":
        snaps = [[0, 0, 0]];
        break;
      case "line":
        snaps = [
          [0, s.y, 0],
          [0, -s.y, 0],
        ];
        break;
    }

    for (const snap of snaps) {
      const sphere = this.generateSnapMarker(snap[0], snap[1], snap[2]);
      // console.log(snap, sphere)
      this.add(sphere);
      this.markers.push(sphere);
    }
  }

  generateSnapMarker(x, y, z): Mesh {
    const sphere = new Mesh(this.geometry, this.material);
    sphere.position.set(x, y, z);
    return sphere;
  }

  getMarkerWorldPositions() {
    const points: Vector3[] = [];

    for (const marker of this.markers) {
      marker.getWorldPosition(this._pos);
      points.push(this._pos.clone());
    }

    return points;
  }

  // generateSnapMarkers(points): Mesh[] {
  //   const spheres: Mesh[] = [];

  //   for (const p of points) {
  //     const sphere = this.generateSnapMarker(p.x, p.y, p.z);
  //     spheres.push(sphere);
  //   }

  //   return spheres;
  // }
}
