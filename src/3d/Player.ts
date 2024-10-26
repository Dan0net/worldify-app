// 3d/Player.ts

import { Euler, PerspectiveCamera, Scene } from "three";
import { useGameStore } from "../store/GameStore";
import { _PI_2, PLAYER_CAMERA_ANGLE_MAX, PLAYER_CAMERA_ANGLE_MIN } from "../utils/constants";
import { usePlayerStore } from "../store/PlayerStore";
import { useSessionStore } from "../store/SessionStore";
import { useSettingStore } from "../store/SettingStore";

export class Player {
  private moveForward = false;
  private moveBackward = false;
  private moveLeft = false;
  private moveRight = false;

  private cameraEuler: Euler = new Euler(0,0,0, 'YXZ');

  private unsubGameStore: () => void;

  constructor(private canvas: HTMLCanvasElement, private scene: Scene, private camera: PerspectiveCamera) {

    this.onMouseMove = this.onMouseMove.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onPointerLockChange = this.onPointerLockChange.bind(this);

    this.unsubGameStore = useGameStore.subscribe(
      (state) => state.hasStarted,
      (hasStarted, previousHasStarted) => {
        if (hasStarted && hasStarted !== previousHasStarted) this.enableControls();
      }
    );
  }

  dispose() {
    this.unsubGameStore();
    this.disableControls();
  }

  private enableControls() {
    this.canvas.requestPointerLock();

    document.addEventListener('pointerlockchange', this.onPointerLockChange);

    document.addEventListener('keydown', this.onKeyDown, false);
    document.addEventListener('keyup', this.onKeyUp, false);
    document.addEventListener('mousemove', this.onMouseMove, false);
  }

  private disableControls() {
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    console.log('b')

    document.removeEventListener('keydown', this.onKeyDown, false);
    document.removeEventListener('keyup', this.onKeyDown, false);
    document.removeEventListener('mousemove', this.onMouseMove, false);
  }

  private onKeyDown(event: KeyboardEvent) {
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        this.moveForward = true;
        break;
      // Handle other keys
    }
  }

  private onKeyUp(event: KeyboardEvent) {
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        this.moveForward = false;
        break;
      // Handle other keys
    }
  }

  onMouseMove(event: MouseEvent) {
    this.mouseMoved(event);
  }


  private onPointerLockChange = () => {
    console.log('aa', !document.pointerLockElement)
    if (!document.pointerLockElement) {
    //   // Pointer is locked, enable controls
    //   this.enableEventListeners();
    // } else {
    //   // Pointer is unlocked, disable controls
      useGameStore.setState({ hasStarted: false })
    console.log('n')
    this.disableControls();
    }
  };

  mouseMoved( e ) {
    const { mouseSensitivity } = useSettingStore.getState();

		this.cameraEuler.setFromQuaternion( this.camera.quaternion );

		this.cameraEuler.y -= e.movementX * mouseSensitivity;
		this.cameraEuler.x -= e.movementY * mouseSensitivity;

		this.cameraEuler.x = Math.max( _PI_2 - PLAYER_CAMERA_ANGLE_MAX, Math.min( _PI_2 - PLAYER_CAMERA_ANGLE_MIN, this.cameraEuler.x ) );

    this.camera.quaternion.setFromEuler( this.cameraEuler );
	}
}