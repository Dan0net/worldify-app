// builder/Builder.ts
import { acceleratedRaycast } from "three-mesh-bvh";
import { ChunkCoordinator } from "../3d/ChunkCoordinator";
import { InputController } from "../input/InputController";
import { usePlayerStore } from "../store/PlayerStore";
import BuildMarker from "./BuildMarker";
import { BuildPresets } from "./BuildPresets";
import {
  BoxGeometry,
  Intersection,
  LineBasicMaterial,
  Object3D,
  PerspectiveCamera,
  Ray,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WireframeGeometry,
} from "three";
import { BUILD_DISTANCE_MAX } from "../utils/constants";
import { BuildWireframe } from "./BuildWireframe";

export class Builder extends Object3D {
  private buildMarker = new BuildMarker();
  private buildWireframe = new BuildWireframe(
    new WireframeGeometry(new BoxGeometry(1, 1, 1)),
    new LineBasicMaterial({
      color: 0xff0000,
    })
  );
  private buildPresetConfig =
    BuildPresets[usePlayerStore.getState().buildPreset];

  private raycaster = new Raycaster();
  private _vector2 = new Vector2(0, 0);
  private intersect: Intersection | null = null;
  private _cameraDir = new Vector3();
  private _cameraPos = new Vector3();

  constructor(
    private inputController: InputController,
    private camera: PerspectiveCamera,
    private chunkCoordinator: ChunkCoordinator
  ) {
    super();

    this.updateBuildPreset(0);

    this.add(this.buildMarker);
    this.add(this.buildWireframe);

    // this.inputController.on('mousemove', this.mouseMove);
    this.inputController.on("keypress", this.keyPress);
  }

  mouseMove = (delta: number) => {};

  keyPress = (event) => {
    if (event.key_func_name === "next_item") {
      this.updateBuildPreset(1);
    } else if (event.key_func_name === "prev_item") {
      this.updateBuildPreset(-1);
    }
  };

  updateBuildPreset(inc: number) {
    const buildPreset =
      (usePlayerStore.getState().buildPreset + inc + BuildPresets.length) % BuildPresets.length;
    // console.log(buildPresete)
    usePlayerStore.setState({ buildPreset });

    this.buildPresetConfig = BuildPresets[buildPreset];

    this.buildWireframe.setShape(
      this.buildPresetConfig.shape,
      this.buildPresetConfig.size,
      this.buildPresetConfig.constructive
    );
  }

  update(delta: number) {
    this.raycaster.setFromCamera(this._vector2, this.camera); // Example direction
    const intersect = this.raycaster.intersectObject(
      this.chunkCoordinator.castableCollider,
      false
    );

    this.intersect = null;
    let center: Vector3;
    let normal = new Vector3(0, 1, 0);

    if (intersect.length > 0) {
      this.intersect = intersect[0];
      center = this.intersect.point?.clone();
      normal = this.intersect.face?.normal
        ? this.intersect.face.normal.clone()
        : new Vector3(0, 1, 0);
      // console.log(this.intersect)
    } else {
      this.camera.getWorldDirection(this._cameraDir);
      this.camera.getWorldPosition(this._cameraPos);
      this._cameraDir.multiplyScalar(BUILD_DISTANCE_MAX);
      center = this._cameraPos.add(this._cameraDir);
    }

    this.buildMarker.position.copy(center);
    this.buildMarker.lookAt(center.clone().add(normal));

    this.buildWireframe.position.copy(center);
  }
}
