import { processAssetInBackground } from "@/lib/whisper-processor";
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

    if (asset.status === "PROCESSING") {
      return NextResponse.json(
        { message: "El audio ya se está procesando.", status: asset.status },
        { status: 409 },
      );
    }

    if (asset.status === "COMPLETED") {
      return NextResponse.json(
        { message: "El audio ya fue procesado.", status: asset.status },
        { status: 200 },
      );
    }

    await prisma.audioAsset.update({
      where: { id },
      data: { status: "PROCESSING" },
    });

    processAssetInBackground(id);

    return NextResponse.json(
      {
        id,
        status: "PROCESSING",
        message: "Procesamiento iniciado.",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Process error:", error);

    await prisma.audioAsset
      .update({
        where: { id },
        data: { status: "ERROR" },
      })
      .catch(() => undefined);

    return NextResponse.json(
      { error: "No se pudo iniciar el procesamiento del audio." },
      { status: 500 },
    );
  }
}
