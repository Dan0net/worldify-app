// worker/ApiWorkerPool.ts
import { WorkerPool } from './WorkerPool';
let apiWorkerPool: WorkerPool;

export function getChunkWorkerPool(): WorkerPool {
  if (!apiWorkerPool) {
    apiWorkerPool = new WorkerPool('./ChunkWorker.ts', 1); // Pool size of 4
  }
  return apiWorkerPool;
}