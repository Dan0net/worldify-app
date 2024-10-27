// ui/HudUI.tsx
import React from 'react';
import { usePlayerStore } from '../store/PlayerStore';
import { useChunkStore } from '../store/ChunkStore';

export const HudUI: React.FC = () => {
  const { chunkCoord } = usePlayerStore();
  const { currentChunk, chunks } = useChunkStore();

  return (
    <div id="hud-ui">
      <div>Coordinates: {`${chunkCoord.x}, ${chunkCoord.y}, ${chunkCoord.z}`}</div>
      <div>Chunk: {currentChunk?.id || 'N/A'}</div>
      <div>Owner: {currentChunk?.owner || 'N/A'}</div>
      <div>Store chunks: {chunks?.size || 'N/A'}</div>
    </div>
  );
};