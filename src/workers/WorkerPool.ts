// worker/WorkerPool.ts
export class WorkerPool {
  private workers: Worker[] = [];
  private taskQueue: Array<{ data: any; resolve: (result: any) => void }> = [];
  private busyWorkers: Set<Worker> = new Set();

  constructor(private workerScript: string, private poolSize: number) {
    for (let i = 0; i < poolSize; i++) {
      const worker = new Worker(new URL(workerScript, import.meta.url), {
        type: "module",
      });
      worker.onmessage = (e) => this.handleWorkerMessage(worker, e);
      this.workers.push(worker);
    }
  }

  private handleWorkerMessage(worker: Worker, event: MessageEvent) {
    const result = event.data;
    this.busyWorkers.delete(worker);
    this.checkQueue();
    // Resolve the promise associated with the task
    const task = this.currentTasks.get(worker);
    if (task) {
      task.resolve(result);
      this.currentTasks.delete(worker);
    }
  }

  private currentTasks = new Map<Worker, { resolve: (result: any) => void }>();

  private checkQueue() {
    if (this.taskQueue.length === 0) return;
    const availableWorker = this.workers.find((w) => !this.busyWorkers.has(w));
    if (!availableWorker) return;

    const task = this.taskQueue.shift()!;
    this.busyWorkers.add(availableWorker);
    this.currentTasks.set(availableWorker, task);
    availableWorker.postMessage(task.data);
  }

  public enqueueTask(data: any): Promise<any> {
    return new Promise((resolve) => {
      this.taskQueue.push({ data, resolve });
      this.checkQueue();
    });
  }

  public terminate() {
    for (const worker of this.workers) {
      worker.terminate();
    }
  }
}
