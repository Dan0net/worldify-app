// worker/apiChunkWorker.ts
import { generateMeshWorker } from './MeshWorkerMultimat';

self.onmessage = (event) => {
  const { grid, gridSize, adjustedIndices, lightIncidents, lightIndices  } = event.data;

  const data = generateMeshWorker(
    grid,
    gridSize,
    adjustedIndices,
    lightIncidents,
    lightIndices
  )

  self.postMessage( data );
};