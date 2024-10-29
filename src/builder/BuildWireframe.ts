import {
  BoxGeometry,
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

  public setShape(shape: string, size: Vector3, constructive: boolean) {
    switch (shape) {
      case "cube":
        this.geometry = new WireframeGeometry(
          new BoxGeometry(size.x, size.y, size.z)
        );
        break;
      case "sphere":
        this.geometry = new WireframeGeometry(new SphereGeometry(size.x, 8, 8));
        break;
    }

    (this.material as LineBasicMaterial).color.set(constructive ? 0x00FF00 : 0xFF0000);
  }
}
