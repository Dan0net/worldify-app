// 3d/Player.ts
import { PerspectiveCamera, Scene } from 'three';
import { InputController } from '../controllers/InputController';
import { usePlayerStore } from '../store/PlayerStore';

export class Player {
  controls: InputController;

  constructor(private scene: Scene, private camera: PerspectiveCamera) {
    this.camera = camera;
    this.controls = new InputController(this.camera);
  }

  update(deltaTime: number) {
    this.controls.update(deltaTime);
    const position = this.camera.position;
    usePlayerStore.setState({ position });
  }
}