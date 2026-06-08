import { processingQueue } from "@/lib/processing-queue";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const status = await processingQueue.getStatusWithActive();

    return NextResponse.json(status);
  } catch (error) {
    console.error("Process status error:", error);

    return NextResponse.json(
      { error: "No se pudo obtener el estado de procesamiento." },
      { status: 500 },
    );
  }
}
