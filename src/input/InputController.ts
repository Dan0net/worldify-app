import { MenuStatus, useGameStore } from "../store/GameStore";
import { useSessionStore } from "../store/SessionStore";
import { useSettingStore } from "../store/SettingStore";

export class InputController {
  private unsubGameStore: () => void;

  private listeners = {};

  private _menuStatus = useGameStore.getState().menuStatus;

  public keyDownFuncs = new Set();
  private _keyHoldMaps = useSettingStore.getState().keys_hold;
  private _keyImpulseMaps = useSettingStore.getState().keys_impulse;

  constructor(private canvas: HTMLCanvasElement) {
    this.unsubGameStore = useGameStore.subscribe(
      (state) => state.menuStatus,
      (menuStatus, previousMenuStatus) => {
        if (menuStatus !== previousMenuStatus) {
          if (menuStatus !== MenuStatus.Home) this.enableControls();
        }
        this._menuStatus = menuStatus;
      }
    );

    // this.unsubGameStore = useGameStore.subscribe(
    //   (state) => state.hasStarted,
    //   (isInventoryVisible, previousIsInventoryVisible) => {
    //     this._isInventoryVisible = isInventoryVisible;
    //   }
    // );

    // this.enableControls();

    window.oncontextmenu = () => false;

    this.on("input", this.handleInput);
  }

  dispose() {
    this.unsubGameStore();
    this.disableControls();
  }

  update(delta: number) {
    if (
      !document.pointerLockElement &&
      this._menuStatus === MenuStatus.Playing
    ) {
      this.canvas.requestPointerLock();
    } else if (
      document.pointerLockElement &&
      this._menuStatus !== MenuStatus.Playing
    ) {
      document.exitPointerLock();
    }
  }

  private onPointerLockChange = (event) => {
    // event.preventDefault();

    if (!document.pointerLockElement && this._menuStatus === MenuStatus.Playing) {
      useGameStore.setState({ menuStatus: MenuStatus.Inventory });
      // this.disableControls();
    } else {
      // this.enableControls();
      // useGameStore.setState({ isInventoryVisible: false });
    }
  };

  private enableControls() {
    this.canvas.requestPointerLock();

    document.addEventListener("pointerlockchange", this.onPointerLockChange);
    document.addEventListener("keydown", this.onKeyDown, false);
    document.addEventListener("keyup", this.onKeyUp, false);
    document.addEventListener("mousemove", this.onMouseMove, false);
    document.addEventListener("mousedown", this.onMouseDown, false);
    document.addEventListener("wheel", this.onMouseWheel, false);
  }

  private disableControls() {
    document.removeEventListener("pointerlockchange", this.onPointerLockChange);
    document.removeEventListener("keydown", this.onKeyDown, false);
    document.removeEventListener("keyup", this.onKeyDown, false);
    document.removeEventListener("mousemove", this.onMouseMove, false);
    document.removeEventListener("mousedown", this.onMouseDown, false);
    document.removeEventListener("wheel", this.onMouseWheel, false);
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
    event.preventDefault();

    const key_func = Object.keys(this._keyHoldMaps).find(
      (key) => this._keyHoldMaps[key] === event.code
    );
    if (key_func) {
      this.keyDownFuncs.add(key_func);
    } else {
      const key_func_name = Object.keys(this._keyImpulseMaps).find(
        (key) => this._keyImpulseMaps[key] === event.code
      );
      // console.log(key_func_name, event.code, this._keyPressMaps)
      if (key_func_name) {
        this.emit("input", { key_func_name, ...event });
      } else {
        console.log(event.code);
      }
    }
  };

  private onKeyUp = (event: KeyboardEvent) => {
    event.preventDefault();

    const key_func = Object.keys(this._keyHoldMaps).find(
      (key) => this._keyHoldMaps[key] === event.code
    );
    if (key_func) this.keyDownFuncs.delete(key_func);
  };

  onMouseMove = (event: MouseEvent) => {
    // event.preventDefault();

    this.emit("mousemove", event);
  };

  onMouseDown = (event: MouseEvent) => {
    event.preventDefault();
    // console.log(event)
    let code;
    switch (event.buttons) {
      case 1:
        code = "MouseLeft";
        break;
      case 2:
        code = "MouseRight";
        break;
      case 4:
        code = "MouseMiddle";
        break;
    }
    if (code) {
      const key_func_name = Object.keys(this._keyImpulseMaps).find(
        (key) => this._keyImpulseMaps[key] === code
      );
      if (key_func_name) this.emit("input", { key_func_name, ...event });
    }
  };

  onMouseWheel = (event: WheelEvent) => {
    // event.preventDefault();

    const code = event.deltaY > 0 ? "WheelUp" : "WheelDown";
    const key_func_name = Object.keys(this._keyImpulseMaps).find(
      (key) => this._keyImpulseMaps[key] === code
    );
    // console.log(key_func_name, event.code, this._keyPressMaps)
    if (key_func_name) this.emit("input", { key_func_name, ...event });
  };

  handleInput = (event) => {
    console.log(event)
    if (event.key_func_name === "inventory" || event.key_func_name === "inventory2") {
      console.log(event)
      const menuStatus =
        this._menuStatus === MenuStatus.Playing
          ? MenuStatus.Inventory
          : MenuStatus.Playing;
      useGameStore.setState({ menuStatus });
      // useGameStore.getState().toggleInventory();
      // console.log(useGameStore.getState().isInventoryVisible);
      // this.exitPointerLock();
    }

    if (event.key_func_name === "map") {
      console.log(event)
      useGameStore.setState({ menuStatus: MenuStatus.Map });
    }
  };
}
