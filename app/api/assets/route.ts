import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const assets = await prisma.audioAsset.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        filename: true,
        fileUrl: true,
        durationMs: true,
        originalCreatedAt: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(assets);
  } catch (error) {
    console.error("Assets list error:", error);
    return NextResponse.json(
      { error: "No se pudieron cargar los audios." },
      { status: 500 },
    );
  }
}
