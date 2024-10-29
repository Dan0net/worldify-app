import { useGameStore } from "../store/GameStore";
import { useSessionStore } from "../store/SessionStore";
import { useSettingStore } from "../store/SettingStore";

export class InputController {
  private unsubGameStore: () => void;

  public fwdPressed = false;
  public bkdPressed = false;
  public lftPressed = false;
  public rgtPressed = false;
  public spacePressed = false;

  private listeners = {};

  private _hasStarted = useGameStore.getState().hasStarted;

  public keyDownFuncs = new Set();
  private _keyDownMaps = useSettingStore.getState().keys_down;
  private _keyPressMaps = useSettingStore.getState().keys_press;

  constructor(private canvas: HTMLCanvasElement) {
    this.unsubGameStore = useGameStore.subscribe(
      (state) => state.hasStarted,
      (hasStarted, previousHasStarted) => {
        if (hasStarted && hasStarted !== previousHasStarted)
          this.enableControls();
        if (!hasStarted && hasStarted !== previousHasStarted)
          this.disableControls();
        this._hasStarted = hasStarted;
      }
    );
  }

  update(delta: number) {
    if (!document.pointerLockElement && this._hasStarted) {
      this.canvas.requestPointerLock();
    }
  }

  private onPointerLockChange = () => {
    if (!document.pointerLockElement) {
      useGameStore.setState({ hasStarted: false });
      this.disableControls();
    }
  };

  dispose() {
    this.unsubGameStore();
    this.disableControls();
  }

  private enableControls() {
    this.canvas.requestPointerLock();

    document.addEventListener("pointerlockchange", this.onPointerLockChange);
    document.addEventListener("keydown", this.onKeyDown, false);
    document.addEventListener("keyup", this.onKeyUp, false);
    document.addEventListener("keypress", this.onKeyPress, false);
    document.addEventListener("mousemove", this.onMouseMove, false);
    document.addEventListener("mousedown", this.onMouseDown, false);
  }

  private disableControls() {
    document.removeEventListener("pointerlockchange", this.onPointerLockChange);
    document.removeEventListener("keydown", this.onKeyDown, false);
    document.removeEventListener("keyup", this.onKeyDown, false);
    document.removeEventListener("keypress", this.onKeyPress, false);
    document.removeEventListener("mousemove", this.onMouseMove, false);
    document.removeEventListener("mousedown", this.onMouseDown, false);
  }

  // Simple event emitter methods
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = new Set();
    }
    this.listeners[event].add(callback);
  }

  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].delete(callback);
    }
  }

  emit(event, data) {
    if (this.listeners[event]) {
      for (const callback of this.listeners[event]) {
        callback(data);
      }
    }
  }

  private onKeyDown = (event: KeyboardEvent) => {
    const key_func = Object.keys(this._keyDownMaps).find(
      (key) => this._keyDownMaps[key] === event.code
    );
    if (key_func) this.keyDownFuncs.add(key_func);
    if (!key_func) console.log(event.code);
  };

  private onKeyUp = (event: KeyboardEvent) => {
    const key_func = Object.keys(this._keyDownMaps).find(
      (key) => this._keyDownMaps[key] === event.code
    );
    if (key_func) this.keyDownFuncs.delete(key_func);
  };

  onKeyPress = (event: KeyboardEvent) => {
    const key_func_name = Object.keys(this._keyPressMaps).find(
      (key) => this._keyPressMaps[key] === event.code
    );
    // console.log(key_func_name, event.code, this._keyPressMaps)
    if (key_func_name) this.emit("keypress", { key_func_name, ...event });
  };

  onMouseMove = (event: MouseEvent) => {
    this.emit("mousemove", event);
  };

  onMouseDown = (event: MouseEvent) => {
    this.emit("mousedown", event);
  };
}
