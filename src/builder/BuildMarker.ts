import {
  BufferGeometry,
  EllipseCurve,
  Line,
  LineBasicMaterial,
  LineLoop,
  Object3D,
  Vector3,
} from "three";

export default class BuildMarker extends Object3D {
  constructor() {
    super();

    const points = [
        new Vector3(0, 0, 0),
        new Vector3(0, 0, 4)
    ];
    const lineGeometry = new BufferGeometry().setFromPoints(points);

    const lineMaterial = new LineBasicMaterial({
      color: 0xffffff,
      linewidth: 4,
    });

    const line = new Line(lineGeometry, lineMaterial);

    this.add(line);

    const curve = new EllipseCurve(
      0.0,
      0, // Center x, y
      2.0,
      2.0, // x radius, y radius
      0.0,
      2.0 * Math.PI // Start angle, stop angle
    );

    const pts = curve.getSpacedPoints(32);
    const geo = new BufferGeometry().setFromPoints(pts);
    const circleMaterial = new LineBasicMaterial({
      color: 0xffffff,
      linewidth: 4,
    });
    const circle = new LineLoop(geo, circleMaterial);
    circle.position.set(0, 0, 0.3);
    this.add(circle);
  }
}
