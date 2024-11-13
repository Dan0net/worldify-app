// api/URI.ts

import { usePlayerStore } from "../store/PlayerStore";
import { ChunkCoord } from "../utils/interfaces";

export class URI {
  private unsubPlayerStore;
  private _chunkCoord;
  private setPlayerChunkCoord = usePlayerStore.getState().setPlayerChunkCoord;

  constructor() {
    const { chunkCoord } = usePlayerStore.getState();
    this.updateURI(chunkCoord);

    this.unsubPlayerStore = usePlayerStore.subscribe(
      (state) => state.chunkCoord,
      (chunkCoord, previousChunkCoord) => {
        // console.log(chunkCoord, previousChunkCoord);
        if (chunkCoord !== this._chunkCoord) {
          this.updateURI(chunkCoord);
        }
      }
    );

    window.addEventListener("hashchange", this.readURI);
  }

  updateURI(chunkCoord: ChunkCoord) {
    // console.log(chunkCoord);
    const { x, y, z } = chunkCoord;
    // const newURL = `${window.location.protocol}//${window.location.host}${window.location.pathname}?x=${x}&y=${y}&z=${z}`;

    // history.replaceState({ x, y, z }, "", newURL);

    const hashValue = `x=${encodeURIComponent(x)}&y=${encodeURIComponent(y)}&z=${encodeURIComponent(z)}`;
    window.location.hash = hashValue;

    this._chunkCoord = chunkCoord;
  }

  readURI = (event) => {
    // const params = new URLSearchParams(window.location.search);

    const hash = window.location.hash.substring(1); // Remove the '#' character
    const params = new URLSearchParams(hash);

    const x = parseInt(params.get("x"));
    const y = parseInt(params.get("y"));
    const z = parseInt(params.get("z"));

    if (
      !this._chunkCoord ||
      x !== this._chunkCoord.x ||
      y !== this._chunkCoord.y ||
      z !== this._chunkCoord.z
    ) {
      const chunkCoord = { x, y, z };
      this._chunkCoord = chunkCoord;
      this.setPlayerChunkCoord(chunkCoord);
    }
  };
}
