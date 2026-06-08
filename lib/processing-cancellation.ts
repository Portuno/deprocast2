type ActiveJob = {
  abort: () => void;
};

const activeJobs = new Map<string, ActiveJob>();
const cancelledIds = new Set<string>();

export class ProcessingCancelledError extends Error {
  constructor() {
    super("Procesamiento cancelado");
    this.name = "ProcessingCancelledError";
  }
}

export function registerActiveJob(assetId: string, abort: () => void): void {
  activeJobs.set(assetId, { abort });
}

export function unregisterActiveJob(assetId: string): void {
  activeJobs.delete(assetId);
  cancelledIds.delete(assetId);
}

export function requestCancellation(assetId: string): boolean {
  cancelledIds.add(assetId);

  const job = activeJobs.get(assetId);
  if (job) {
    job.abort();
    return true;
  }

  return true;
}

export function isCancelled(assetId: string): boolean {
  return cancelledIds.has(assetId);
}

export function clearCancellation(assetId: string): void {
  cancelledIds.delete(assetId);
}
