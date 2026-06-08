import { processingQueue } from "@/lib/processing-queue";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  try {
    const pendingAssets = await prisma.audioAsset.findMany({
      where: { status: { in: ["PENDING", "ERROR"] } },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });

    const added = processingQueue.enqueueMany(
      pendingAssets.map((asset) => asset.id),
    );

    const status = await processingQueue.getStatusWithActive();

    return NextResponse.json({
      added,
      skipped: pendingAssets.length - added,
      queuedCount: status.queuedCount + (status.active ? 1 : 0),
      message:
        added > 0
          ? `${added} audio${added === 1 ? "" : "s"} agregado${added === 1 ? "" : "s"} a la cola.`
          : "No hay audios nuevos para encolar.",
    });
  } catch (error) {
    console.error("Process queue error:", error);

    return NextResponse.json(
      { error: "No se pudo encolar el procesamiento." },
      { status: 500 },
    );
  }
}
