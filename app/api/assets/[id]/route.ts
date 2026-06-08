import { getAssetDetail } from "@/lib/queries/get-asset-detail";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const asset = await getAssetDetail(id);

    if (!asset) {
      return NextResponse.json(
        { error: "Audio no encontrado." },
        { status: 404 },
      );
    }

    return NextResponse.json(asset);
  } catch (error) {
    console.error("Asset detail error:", error);
    return NextResponse.json(
      { error: "No se pudo cargar el detalle del audio." },
      { status: 500 },
    );
  }
}
