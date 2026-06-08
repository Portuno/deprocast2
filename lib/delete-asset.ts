import { processingQueue } from "@/lib/processing-queue";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

function resolveInputPath(fileUrl: string): string {
  const relativePath = fileUrl.startsWith("/") ? fileUrl.slice(1) : fileUrl;
  return path.resolve(process.cwd(), "public", relativePath);
}

function removeFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.warn(`No se pudo eliminar ${filePath}:`, error);
  }
}

export async function deleteAudioAsset(id: string): Promise<boolean> {
  const asset = await prisma.audioAsset.findUnique({ where: { id } });

  if (!asset) {
    return false;
  }

  processingQueue.cancel(id);

  const filePath = resolveInputPath(asset.fileUrl);
  removeFile(filePath);

  await prisma.audioAsset.delete({ where: { id } });

  return true;
}
