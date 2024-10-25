// ui/HudUI.tsx
import React from 'react';
import { usePlayerStore } from '../store/PlayerStore';
import { useChunkStore } from '../store/ChunkStore';

export const HudUI: React.FC = () => {
  const { position } = usePlayerStore();
  const { currentChunk } = useChunkStore();

  return (
    <div id="hud-ui">
      <div>Coordinates: {`${position.x}, ${position.y}, ${position.z}`}</div>
      <div>Chunk: {currentChunk?.name || 'N/A'}</div>
      <div>Owner: {currentChunk?.owner || 'N/A'}</div>
    </div>
  );
};