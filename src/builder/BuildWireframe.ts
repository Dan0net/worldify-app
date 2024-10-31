import {
  BoxGeometry,
  Color,
  ColorRepresentation,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  SphereGeometry,
  Vector3,
  WireframeGeometry,
} from "three";

export class BuildWireframe extends LineSegments {
  constructor(geometry: WireframeGeometry, material: LineBasicMaterial) {
    super(geometry, material);
  }

  public setShape(shape: string, size: Vector3, color: ColorRepresentation) {
    switch (shape) {
      case "cube":
        this.geometry = new WireframeGeometry(
          new BoxGeometry(size.x, size.y, size.z)
        );
        break;
      case "line":
        this.geometry = new WireframeGeometry(
          new BoxGeometry(0, size.y, 0)
        );
        break;
      case "plane":
        this.geometry = new WireframeGeometry(
          new BoxGeometry(size.x, size.y, 0)
        );
        break;
      case "sphere":
        this.geometry = new WireframeGeometry(new SphereGeometry(size.x, 8, 8));
        break;
      case "point":
        this.geometry = new WireframeGeometry(new SphereGeometry(0.5, 8, 8));
        break;
    }

    (this.material as LineBasicMaterial).color.set(color);
  }
}
