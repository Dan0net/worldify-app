// api/URI.ts

import { usePlayerStore } from "../store/PlayerStore";

export class URI {
  constructor() {
    const { position } = usePlayerStore.getState();
    this.updateURI(position);
    usePlayerStore.subscribe((state) => {
      this.updateURI(state.position);
    });
  }

  updateURI(position: { x: number; y: number; z: number }) {
    const uri = `/${Math.floor(position.x)}-${Math.floor(position.y)}-${Math.floor(position.z)}`;
    window.history.replaceState(null, '', uri);
  }
}