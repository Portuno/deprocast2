import { processingQueue } from "@/lib/processing-queue";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const asset = await prisma.audioAsset.findUnique({ where: { id } });

    if (!asset) {
      return NextResponse.json(
        { error: "Audio no encontrado." },
        { status: 404 },
      );
    }

    if (asset.status === "COMPLETED") {
      return NextResponse.json(
        { message: "El audio ya fue procesado.", status: asset.status },
        { status: 200 },
      );
    }

    if (processingQueue.isQueued(id)) {
      const status = await processingQueue.getStatusWithActive();
      const position =
        status.active?.id === id
          ? 0
          : status.queuedIds.indexOf(id) + (status.active ? 1 : 0);

      return NextResponse.json(
        {
          id,
          status: asset.status,
          message: "El audio ya está en la cola de procesamiento.",
          position,
        },
        { status: 200 },
      );
    }

    if (asset.status === "PROCESSING") {
      return NextResponse.json(
        { message: "El audio ya se está procesando.", status: asset.status },
        { status: 409 },
      );
    }

    processingQueue.enqueue(id);

    const status = await processingQueue.getStatusWithActive();
    const position =
      status.active?.id === id
        ? 0
        : status.queuedIds.indexOf(id) + (status.active ? 1 : 0);

    return NextResponse.json(
      {
        id,
        status: "QUEUED",
        message: "Audio agregado a la cola de procesamiento.",
        position,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Process error:", error);

    return NextResponse.json(
      { error: "No se pudo encolar el procesamiento del audio." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const asset = await prisma.audioAsset.findUnique({ where: { id } });

    if (!asset) {
      return NextResponse.json(
        { error: "Audio no encontrado." },
        { status: 404 },
      );
    }

    const result = processingQueue.cancel(id);

    if (result === "not_found" && asset.status !== "PROCESSING") {
      return NextResponse.json(
        { error: "El audio no está en la cola ni procesándose." },
        { status: 409 },
      );
    }

    if (result === "removed_from_queue") {
      return NextResponse.json({
        id,
        status: asset.status,
        message: "Audio removido de la cola.",
      });
    }

    return NextResponse.json({
      id,
      status: "CANCELLING",
      message: "Deteniendo transcripción...",
    });
  } catch (error) {
    console.error("Process cancel error:", error);

    return NextResponse.json(
      { error: "No se pudo detener el procesamiento." },
      { status: 500 },
    );
  }
}
