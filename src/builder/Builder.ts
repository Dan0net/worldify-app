// builder/Builder.ts
import { ChunkCoordinator } from "../3d/ChunkCoordinator";
import { InputController } from "../input/InputController";
import { usePlayerStore } from "../store/PlayerStore";
import BuildMarker from "./BuildMarker";
import { BuildPresets } from "./BuildPresets";
import {
  Box3Helper,
  BoxGeometry,
  Color,
  Euler,
  Intersection,
  LineBasicMaterial,
  Mesh,
  Object3D,
  PerspectiveCamera,
  Ray,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WireframeGeometry,
} from "three";
import {
  BUILD_DISTANCE_MAX,
  BUILD_ROTATION_STEP,
  BUILD_SNAP_MARKER_COUNT_MAX,
  BUILD_SNAP_MARKER_SIZE,
} from "../utils/constants";
import { BuildWireframe } from "./BuildWireframe";
import { Box3, Quaternion } from "three";
import { getExtents } from "../utils/functions";
import BuildSnapMarker from "./BuildSnapMarker";
import { string } from "three/webgpu";

export class Builder extends Object3D {
  private buildMarker = new BuildMarker();
  private buildCollider = new BuildWireframe(
    new WireframeGeometry(new BoxGeometry(1, 1, 1)),
    new LineBasicMaterial({
      color: 0xff0000,
    })
  );
  private buildShape = new BuildWireframe(
    new WireframeGeometry(new BoxGeometry(1, 1, 1)),
    new LineBasicMaterial({
      color: 0xffff00,
    })
  );
  private buildSnapMarker: BuildSnapMarker = new BuildSnapMarker();
  private snapMarkers: Mesh[] = [];
  private snapPointMap = new Map<string, Vector3>();

  private buildPresetConfig =
    BuildPresets[usePlayerStore.getState().buildPreset];

  private raycaster = new Raycaster();
  private _vector2 = new Vector2(0, 0);
  private intersect: Intersection | null = null;
  private _cameraDir = new Vector3();
  private _cameraPos = new Vector3();
  private _up = new Vector3(0, 1, 0);
  private _left = new Vector3(1, 0, 0);
  private _forward = new Vector3(0, 0, 1);
  private _rotationY = 0;
  private _bbox = new Box3();
  private _bboxVoxel = new Box3();
  private _yAxisQuaternion = new Quaternion();
  private _xAxisQuaternion = new Quaternion();
  private _xyAxisQuaternion = new Quaternion();

  private voxelBoxHelper = new Box3Helper(this._bboxVoxel, 0xffffff);

  constructor(
    private inputController: InputController,
    private camera: PerspectiveCamera,
    private chunkCoordinator: ChunkCoordinator
  ) {
    super();

    this.updateBuildPreset(0);

    this.add(this.buildMarker);
    this.add(this.buildCollider);
    this.add(this.buildShape);
    this.add(this.buildSnapMarker);

    this.add(this.voxelBoxHelper);

    // this.inputController.on('mousemove', this.mouseMove);
    this.inputController.on("input", this.handleInput);
  }

  mouseMove = (delta: number) => {};

  handleInput = (event) => {
    switch (event.key_func_name) {
      case "next_item":
        this.updateBuildPreset(1);
        break;
      case "prev_item":
        this.updateBuildPreset(-1);
        break;
      case "next_rotate":
        this.rotateBuildConfig(1);
        break;
      case "prev_rotate":
        this.rotateBuildConfig(-1);
        break;
      case "place":
        this.placeBuild();
        break;
    }
  };

  updateBuildPreset(inc: number) {
    const buildPreset =
      (usePlayerStore.getState().buildPreset + inc + BuildPresets.length) %
      BuildPresets.length;
    // console.log(buildPresete)
    usePlayerStore.setState({ buildPreset });

    this.buildPresetConfig = BuildPresets[buildPreset];

    this.buildCollider.setShape(
      this.buildPresetConfig.snapShape,
      this.buildPresetConfig.size,
      this.buildPresetConfig.constructive ? 0x00ff00 : 0xff0000
    );

    this.buildShape.setShape(
      this.buildPresetConfig.shape,
      this.buildPresetConfig.size,
      new Color(1, 1, 0)
    );

    this.buildSnapMarker.setBuildPresetConfig(this.buildPresetConfig);
  }

  rotateBuildConfig(inc: number) {
    this._rotationY =
      (this._rotationY +
        (inc > 0 ? BUILD_ROTATION_STEP : -BUILD_ROTATION_STEP)) %
      (Math.PI * 2);
  }

  placeBuild() {
    const _markersWorldPos = this.buildSnapMarker.getMarkerWorldPositions();
    // const _markers = this.buildSnapMarker.generateSnapMarkers(
    //   _markersWorldPos
    // );

    for (const p of _markersWorldPos) {
      const key = `${p.x}:${p.y}:${p.z}`;

      if (!this.snapPointMap.has(key)) {
        this.snapPointMap.set(key, p);
        const marker = this.buildSnapMarker.generateSnapMarker(p.x, p.y, p.z);
        this.snapMarkers.push(marker);
        this.add(marker);
      }
    }

    while (this.snapMarkers.length > BUILD_SNAP_MARKER_COUNT_MAX) {
      const marker = this.snapMarkers.shift();
      if (marker) {
        const p = marker.position;
        const key = `${p.x}:${p.y}:${p.z}`;
        this.snapPointMap.delete(key);
        this.remove(marker);
      }
    }
  }

  update(delta: number) {
    const { center, normal } = this.raycast();

    this.buildMarker.position.copy(center);
    this.buildMarker.lookAt(center.clone().add(normal));

    const rotation = this.projectBuildShape(center, normal);

    this.snapBuildShape(center, rotation);

    this.buildCollider.position.copy(center);
    this.buildSnapMarker.position.copy(center);
    this.buildShape.position.copy(center);
    this.buildShape.rotation.setFromQuaternion(rotation);

    this._bboxVoxel.set(
      this._bboxVoxel.min.floor().addScalar(-1),
      this._bboxVoxel.max.ceil().addScalar(1)
    );
  }

  raycast(): { center: Vector3; normal: Vector3 } {
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
    return { center, normal };
  }

  projectBuildShape(center: Vector3, normal: Vector3): Quaternion {
    // if (   !this.buildCenterPrevious
    // 	|| this.buildPresetConfig.needsUpdating
    // 	|| !center.equals(this.buildCenterPrevious)
    // 	|| isPlacing){
    // this.buildWireframe.scale.set(1, 1, 1);

    // apply build rotation
    // Step 1: Create a quaternion for the Y-axis rotation (world space)
    this._yAxisQuaternion.setFromAxisAngle(this._up, this._rotationY + Math.PI);

    // Step 2: Create a quaternion for the X-axis rotation (local space)
    this._xAxisQuaternion.setFromAxisAngle(
      this._left,
      this.buildPresetConfig.rotation.x
    );

    // Step 3: Combine the quaternions (apply world Y-axis first, then local X-axis)
    this._xyAxisQuaternion.multiplyQuaternions(
      this._yAxisQuaternion,
      this._xAxisQuaternion
    );

    // bbox for build preset rotation only
    this.buildCollider.quaternion.copy(this._xAxisQuaternion);
    const baseExtents = getExtents(this.buildCollider, this._bbox);

    // bbox for full build rotation (preset + user rotation)
    this.buildCollider.quaternion.copy(this._xyAxisQuaternion);
    const voxelExtents = getExtents(this.buildCollider, this._bboxVoxel);

    // if we touch terrain and need to fancy project the build obj
    if (this.intersect && this.buildPresetConfig.align === "base") {
      // inverse rotate build mesh by build rotation and intersect normal
      const inverseNormal = new Vector3(-normal.x, 0, -normal.z).normalize();

      const inverseNormalQuaternion = new Quaternion().setFromUnitVectors(
        this._forward,
        inverseNormal
      );
      const tempQuaternion = new Quaternion().multiplyQuaternions(
        new Quaternion().multiplyQuaternions(
          this._yAxisQuaternion.clone().invert(), // inverse use input rotation
          this._xAxisQuaternion // keep original build preset rotation
        ),
        inverseNormalQuaternion // inverse intersect normal rotation
      );

      // bbox for build intersecting with collision face
      this.buildCollider.quaternion.copy(tempQuaternion);
      const offsetExtents = getExtents(this.buildCollider, this._bbox);

      if (normal.y < 0.25) {
        // if it's not a horizontal ground surface, offset back away from surface
        const offset = new Vector3(0, 0, offsetExtents.z / 2);

        const normalA = new Vector3(normal.x, 0, normal.z).normalize();

        const offsetQuarternion = new Quaternion().setFromUnitVectors(
          this._forward,
          normalA
        );
        offset.applyQuaternion(offsetQuarternion);

        // add to center
        center.add(offset);
      } else {
        // if it's a flat surface project away from player
        const offset = new Vector3(0, 0, baseExtents.z / 2);
        offset.applyQuaternion(this._yAxisQuaternion);
        center.add(offset);
      }

      //make build wireframe reflect build rotation
      // this.buildWireframe.quaternion.copy(this._xyAxisQuaternion);
    }

    // finally, move up to base level
    if (this.buildPresetConfig.align === "base") {
      center.add(new Vector3(0, voxelExtents.y / 2, 0));
    }

    // move build wireframe to actuall build spot
    // this.buildWireframe.scale.copy( new Vector3(1,1,1).multiplyScalar(this.buildPresetConfig.constructive ? 1.2 : 1.0) )
    this.buildCollider.position.copy(center);
    this.buildCollider.quaternion.copy(this._xyAxisQuaternion);

    // this.buildSnapMarker.quaternion.copy(baseQuaternion);
    // this.buildSnapMarker.position.copy( center )

    return this._xyAxisQuaternion;
  }

  snapBuildShape(center: Vector3, rotation: Quaternion) {
    this.buildSnapMarker.quaternion.copy(rotation);
    this.buildSnapMarker.position.copy(center);

    const snapPoints = this.buildSnapMarker.getMarkerWorldPositions();
    let minSnapDistance = 0.75;
    let snapDelta;
    // TODO use partitioning or mathjs matrix ops
    for (const snapPoint of snapPoints) {
      for (const p of this.snapPointMap.values()) {
        const d = snapPoint.distanceTo(p);
        // console.log(snapPoint, buildSnapPoint)
        // console.log(d)
        if (d < minSnapDistance) {
          minSnapDistance = d;
          snapDelta = snapPoint.sub(p);
        }
      }
    }

    if (snapDelta) {
      center.sub(snapDelta);
    }
  }
}
