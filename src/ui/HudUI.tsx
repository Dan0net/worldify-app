// ui/HudUI.tsx
import React from 'react';
import { usePlayerStore } from '../store/PlayerStore';
import { useChunkStore } from '../store/ChunkStore';

export const HudUI: React.FC = () => {
  const { chunkCoord, visibleChunks, collidableChunks } = usePlayerStore();
  const { currentChunk, chunkDataKeys } = useChunkStore();

  return (
    <div id="hud-ui">
      <div>Coordinates: {`${chunkCoord.x}, ${chunkCoord.y}, ${chunkCoord.z}`}</div>
      <div>Chunk: {currentChunk?.id || 'N/A'}</div>
      <div>Owner: {currentChunk?.owner || 'N/A'}</div>
      <div>Chunks total: {chunkDataKeys.length || 'N/A'} | visible: {visibleChunks || 'N/A'} | collidable: {collidableChunks || 'N/A'}</div>
    </div>
  );
};