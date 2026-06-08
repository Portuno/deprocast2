import { requestCancellation } from "@/lib/processing-cancellation";
import { processAssetWhisper } from "@/lib/whisper-processor";
import { prisma } from "@/lib/prisma";

type QueueStatus = {
  active: {
    id: string;
    filename: string;
    partialText: string | null;
    status: string;
  } | null;
  queuedIds: string[];
  queuedCount: number;
};

class ProcessingQueue {
  private queue: string[] = [];
  private running = false;
  private activeId: string | null = null;

  isQueued(assetId: string): boolean {
    return this.queue.includes(assetId) || this.activeId === assetId;
  }

  getStatus(): QueueStatus {
    return {
      active: null,
      queuedIds: [...this.queue],
      queuedCount: this.queue.length,
    };
  }

  async getStatusWithActive(): Promise<QueueStatus> {
    const base = this.getStatus();

    if (!this.activeId) {
      return base;
    }

    const asset = await prisma.audioAsset.findUnique({
      where: { id: this.activeId },
      select: {
        id: true,
        filename: true,
        partialText: true,
        status: true,
      },
    });

    return {
      ...base,
      active: asset,
    };
  }

  enqueue(assetId: string): boolean {
    if (this.isQueued(assetId)) {
      return false;
    }

    this.queue.push(assetId);
    void this.processNext();
    return true;
  }

  enqueueMany(assetIds: string[]): number {
    let added = 0;

    for (const assetId of assetIds) {
      if (this.enqueue(assetId)) {
        added += 1;
      }
    }

    return added;
  }

  cancel(assetId: string): "removed_from_queue" | "stopped_active" | "not_found" {
    const queueIndex = this.queue.indexOf(assetId);
    if (queueIndex !== -1) {
      this.queue.splice(queueIndex, 1);
      return "removed_from_queue";
    }

    if (this.activeId === assetId) {
      requestCancellation(assetId);
      return "stopped_active";
    }

    return "not_found";
  }

  private async processNext(): Promise<void> {
    if (this.running) {
      return;
    }

    const assetId = this.queue.shift();
    if (!assetId) {
      return;
    }

    this.running = true;
    this.activeId = assetId;

    try {
      await prisma.audioAsset.update({
        where: { id: assetId },
        data: { status: "PROCESSING", partialText: null },
      });

      await processAssetWhisper(assetId);
    } catch (error) {
      console.error(`Error en cola procesando ${assetId}:`, error);

      await prisma.audioAsset
        .update({
          where: { id: assetId },
          data: { status: "ERROR", partialText: null },
        })
        .catch(() => undefined);
    } finally {
      this.activeId = null;
      this.running = false;
      void this.processNext();
    }
  }
}

const globalForQueue = globalThis as typeof globalThis & {
  processingQueue?: ProcessingQueue;
};

export const processingQueue =
  globalForQueue.processingQueue ?? new ProcessingQueue();

if (process.env.NODE_ENV !== "production") {
  globalForQueue.processingQueue = processingQueue;
}
