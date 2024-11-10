// 3d/Player.ts

import {
  Box3,
  Euler,
  Line3,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  Scene,
  Vector3,
} from "three";
import { MenuStatus, useGameStore } from "../store/GameStore";
import {
  _PI_2,
  PHYSICS_STEPS,
  PLAYER_CAMERA_ANGLE_MAX,
  PLAYER_CAMERA_ANGLE_MIN,
  PLAYER_FLY_SPEED,
  PLAYER_GRAVITY,
  PLAYER_RUN_MULTIPLYER,
  PLAYER_SPEED,
  TERRAIN_SIZE,
} from "../utils/constants";
import { usePlayerStore } from "../store/PlayerStore";
import { useSettingStore } from "../store/SettingStore";
import { ChunkCoordinator } from "./ChunkCoordinator";
import { RoundedBoxGeometry } from "three/examples/jsm/Addons.js";
import { InputController } from "../input/InputController";
import { UP } from "../utils/vector_utils";
import { ChunkCoord } from "../utils/interfaces";

export class Player extends Object3D {
  private playerIsOnGround = false;
  private playerVelocity = new Vector3();
  private tempVector = new Vector3();
  private tempVector2 = new Vector3();
  private tempBox = new Box3();
  private tempMat = new Matrix4();
  private tempSegment = new Line3();

  private flyMode = true;

  private capsuleInfo = {
    radius: 0.5,
    segment: new Line3(new Vector3(), new Vector3(0, -1.0, 0.0)),
  };

  private playerMesh: Mesh;

  private cameraEuler: Euler = new Euler(0, 0, 0, "YXZ");

  private _menuStatus = useGameStore.getState().menuStatus;
  private unsubGameStore;
  private unsubPlayerStore;
  private setPlayerChunkCoord = usePlayerStore.getState().setPlayerChunkCoord;
  private _chunkCoord;

  private firstPlayerPosition = new Vector3(8, 30, 8);

  constructor(
    private inputController: InputController,
    private camera: PerspectiveCamera,
    private chunkCoordinator: ChunkCoordinator
  ) {
    super();

    this.unsubGameStore = useGameStore.subscribe(
      (state) => state.menuStatus,
      (menuStatus, previousMenuStatus) => {
        if (menuStatus !== previousMenuStatus) {
          // menuStatus === MenuStatus.Playing
          //   ? this.enableControls()
          //   : this.disableControls();
        }
        this._menuStatus = menuStatus;
      }
    );

    this.unsubPlayerStore = usePlayerStore.subscribe(
      (state) => state.firstPlayerChunkCoord,
      (chunkCoord, previousChunkCoord) => {
        if (chunkCoord !== previousChunkCoord) {
          console.log(chunkCoord, previousChunkCoord);
          const position = new Vector3(
            chunkCoord.x * TERRAIN_SIZE + 8,
            chunkCoord.y * TERRAIN_SIZE,
            chunkCoord.z * TERRAIN_SIZE + 8
          )
          this.reset(position);
        }
      }
    );

    this.inputController.on("mousemove", this.mouseMoved);

    this.playerMesh = new Mesh(
      new RoundedBoxGeometry(1.0, 2.0, 1.0, 10, 0.5),
      new MeshStandardMaterial()
    );
    this.playerMesh.geometry.translate(0, -0.5, 0);
    this.playerMesh.castShadow = true;
    this.playerMesh.receiveShadow = true;
    // this.playerMesh.material.shadowSide = 2;
    this.add(this.playerMesh);

    this.inputController.on("input", this.handleInput);

    this.reset(this.firstPlayerPosition);
  }

  dispose() {}

  handleInput = (event) => {
    if (this._menuStatus === MenuStatus.Playing) {
      switch (event.key_func_name) {
        case "fly_toggle":
          this.flyMode = !this.flyMode;
          break;
      }
    }
  };

  mouseMoved = (event: MouseEvent) => {
    if (this._menuStatus !== MenuStatus.Playing) return;

    const { mouseSensitivity } = useSettingStore.getState();

    this.cameraEuler.setFromQuaternion(this.camera.quaternion);

    this.cameraEuler.y -= event.movementX * mouseSensitivity;
    this.cameraEuler.x -= event.movementY * mouseSensitivity;

    this.cameraEuler.x = Math.max(
      _PI_2 - PLAYER_CAMERA_ANGLE_MAX,
      Math.min(_PI_2 - PLAYER_CAMERA_ANGLE_MIN, this.cameraEuler.x)
    );

    this.camera.quaternion.setFromEuler(this.cameraEuler);
  };

  update(delta: number) {
    if (!useGameStore.getState().hasFirstChunkLoaded) return;

    if (this._menuStatus !== MenuStatus.Home) {
      //TODO mvoe this check to inputcontroller
      if (!this.flyMode) {
        if (
          this.inputController.keyDownFuncs.has("jump") &&
          this.playerIsOnGround
        ) {
          this.playerVelocity.y = 15.0;
          this.playerIsOnGround = false;
        }
      }

      const deltaStep = Math.min(delta, 0.1) / PHYSICS_STEPS;
      for (let i = 0; i < PHYSICS_STEPS; i++) {
        this.collisionUpdate(deltaStep);
      }

      const chunkCoord = {
        x: Math.floor(this.position.x / TERRAIN_SIZE),
        y: Math.floor(this.position.y / TERRAIN_SIZE),
        z: Math.floor(this.position.z / TERRAIN_SIZE),
      };
      if (
        !this._chunkCoord ||
        this._chunkCoord.x !== chunkCoord.x ||
        this._chunkCoord.y !== chunkCoord.y ||
        this._chunkCoord.z !== chunkCoord.z
      ) {
        this.setPlayerChunkCoord(chunkCoord);
        this._chunkCoord = chunkCoord;
      }
    }
  }

  collisionUpdate(delta: number) {
    //TODO refector
    if (!this.flyMode) {
      if (this.playerIsOnGround) {
        this.playerVelocity.y = delta * PLAYER_GRAVITY;
      } else {
        this.playerVelocity.y += delta * PLAYER_GRAVITY;
      }
    } else {
      this.playerVelocity.y = 0;
    }

    this.position.addScaledVector(this.playerVelocity, delta);

    if (this._menuStatus !== MenuStatus.Home) {
      // move the player
      const angle = this.cameraEuler.y;
      const moveSpeed =
        (this.flyMode ? PLAYER_FLY_SPEED : PLAYER_SPEED) *
        (this.inputController.keyDownFuncs.has("run")
          ? PLAYER_RUN_MULTIPLYER
          : 1);

      // TODO consolotate into one position update
      if (this.inputController.keyDownFuncs.has("move_forward")) {
        this.tempVector.set(0, 0, -1).applyAxisAngle(UP, angle);
        this.position.addScaledVector(this.tempVector, moveSpeed * delta);
      }

      if (this.inputController.keyDownFuncs.has("move_backward")) {
        this.tempVector.set(0, 0, 1).applyAxisAngle(UP, angle);
        this.position.addScaledVector(this.tempVector, moveSpeed * delta);
      }

      if (this.inputController.keyDownFuncs.has("move_left")) {
        this.tempVector.set(-1, 0, 0).applyAxisAngle(UP, angle);
        this.position.addScaledVector(this.tempVector, moveSpeed * delta);
      }

      if (this.inputController.keyDownFuncs.has("move_right")) {
        this.tempVector.set(1, 0, 0).applyAxisAngle(UP, angle);
        this.position.addScaledVector(this.tempVector, moveSpeed * delta);
      }

      if (this.flyMode) {
        if (this.inputController.keyDownFuncs.has("jump")) {
          this.tempVector.set(0, 1, 0).applyAxisAngle(UP, angle);
          this.position.addScaledVector(this.tempVector, moveSpeed * delta);
        }
        if (this.inputController.keyDownFuncs.has("crouch")) {
          this.tempVector.set(0, -1, 0).applyAxisAngle(UP, angle);
          this.position.addScaledVector(this.tempVector, moveSpeed * delta);
        }
      }

      this.updateMatrixWorld();
    }

    if (!this.flyMode) {
      // return

      // adjust player position based on collisions
      // this.tempBox.makeEmpty();
      // this.tempMat.copy( collider.matrixWorld ).invert();
      // this.tempSegment.copy( this.capsuleInfo.segment );

      // get the position of the capsule in the local space of the collider
      // this.tempSegment.start.applyMatrix4( this.matrixWorld ).applyMatrix4( this.tempMat );
      // this.tempSegment.start.applyMatrix4( this.matrixWorld );
      // this.tempSegment.end.applyMatrix4( this.matrixWorld ).applyMatrix4( this.tempMat );
      // this.tempSegment.end.applyMatrix4( this.matrixWorld );

      this.tempBox.makeEmpty();

      // console.log(mesh.matrixWorld, mesh.position)

      const collider = this.chunkCoordinator.castableCollider;
      if (!collider?.matrixWorld) return;

      this.tempSegment.copy(this.capsuleInfo.segment);
      this.tempMat.copy(collider.matrixWorld).invert();
      // this.tempSegment.start.add(this.position).sub(mesh.position)
      this.tempSegment.start
        .applyMatrix4(this.matrixWorld)
        .applyMatrix4(this.tempMat);
      // this.tempSegment.end.add(this.position)
      this.tempSegment.end
        .applyMatrix4(this.matrixWorld)
        .applyMatrix4(this.tempMat);

      // get the axis aligned bounding box of the capsule
      this.tempBox.expandByPoint(this.tempSegment.start);
      this.tempBox.expandByPoint(this.tempSegment.end);

      // if (mesh.position === new Vector3(0,0,0))
      // console.log(this.tempMat, mesh.matrixWorld, mesh.position)

      this.tempBox.min.addScalar(-this.capsuleInfo.radius);
      this.tempBox.max.addScalar(this.capsuleInfo.radius);

      if (!collider.geometry?.boundsTree) return;
      collider.geometry.boundsTree.shapecast({
        intersectsBounds: (box) => box.intersectsBox(this.tempBox),

        intersectsTriangle: (tri) => {
          // check if the triangle is intersecting the capsule and adjust the
          // capsule position if it is.
          const triPoint = this.tempVector;
          const capsulePoint = this.tempVector2;

          const distance = tri.closestPointToSegment(
            this.tempSegment,
            triPoint,
            capsulePoint
          );
          if (distance < this.capsuleInfo.radius) {
            // console.log(tri, mesh.position)

            const depth = this.capsuleInfo.radius - distance;
            const direction = capsulePoint.sub(triPoint).normalize();
            if (direction.y > 0.5) {
              direction.y = 1;
              direction.x = 0;
              direction.z = 0;
            }

            this.tempSegment.start.addScaledVector(direction, depth);
            this.tempSegment.end.addScaledVector(direction, depth);
          }
        },
      });

      // get the adjusted position of the capsule collider in world space after checking
      // triangle collisions and moving it. capsuleInfo.segment.start is assumed to be
      // the origin of the player model.
      const newPosition = this.tempVector;
      newPosition
        .copy(this.tempSegment.start)
        .applyMatrix4(collider.matrixWorld);
      // newPosition.copy(this.tempSegment.start);

      // check how much the collider was moved
      const deltaVector = this.tempVector2;
      deltaVector.subVectors(newPosition, this.position);

      // if the player was primarily adjusted vertically we assume it's on something we should consider ground
      this.playerIsOnGround =
        deltaVector.y > Math.abs(delta * this.playerVelocity.y * 0.25);

      const offset = Math.max(0.0, deltaVector.length() - 1e-5);
      deltaVector.normalize().multiplyScalar(offset);

      // adjust the player model
      this.position.add(deltaVector);

      if (!this.playerIsOnGround) {
        deltaVector.normalize();
        this.playerVelocity.addScaledVector(
          deltaVector,
          -deltaVector.dot(this.playerVelocity)
        );
      } else {
        this.playerVelocity.set(0, 0, 0);
      }
    }

    // adjust the camera
    // this.camera.position.sub( controls.target );
    // controls.target.copy( this.position );
    this.camera.position.copy(this.position);

    // if the player has fallen too far below the level reset their position to the start
    if (Number.isNaN(this.position.y) || this.position.y < -25) {
      this.reset(this.firstPlayerPosition);
    }
  }

  reset(position: Vector3) {
    console.log("player reset", position);
    
    this.firstPlayerPosition.copy(position);
    this.position.copy(position);
    this.updateMatrixWorld();

    this.playerVelocity.set(0, 0, 0);

    this.camera.position.copy(this.position);

    console.log(this.position);
  }
}
