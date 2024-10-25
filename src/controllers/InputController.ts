// controllers/InputController.ts
import * as THREE from 'three';

export class InputController {
  private moveForward = false;
  private moveBackward = false;
  private moveLeft = false;
  private moveRight = false;

  constructor(private camera: THREE.Camera) {
    this.initEventListeners();
  }

  private initEventListeners() {
    document.addEventListener('keydown', (e) => this.onKeyDown(e), false);
    document.addEventListener('keyup', (e) => this.onKeyUp(e), false);
    document.addEventListener('mousemove', (e) => this.onMouseMove(e), false);
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

  private onMouseMove(event: MouseEvent) {
    // Update camera rotation
  }

  public update(deltaTime: number) {
    // Update camera position based on input
  }

  private initPointerLock() {
    this.canvas.addEventListener('click', () => {
      this.canvas.requestPointerLock();
    });

    document.addEventListener('pointerlockchange', this.onPointerLockChange);
  }

  private onPointerLockChange = () => {
    if (document.pointerLockElement === this.canvas) {
      // Pointer is locked, enable controls
      this.enableControls();
    } else {
      // Pointer is unlocked, disable controls
      this.disableControls();
    }
  };

  private enableControls() {
    // Enable mouse movement and keyboard controls
  }

  private disableControls() {
    // Disable controls
  }
}