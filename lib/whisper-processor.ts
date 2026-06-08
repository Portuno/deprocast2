import { prisma } from "@/lib/prisma";
import { exec } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { promisify } from "util";

const execAsync = promisify(exec);

const WHISPER_CLI = "/home/lautaro/whisper.cpp/build/bin/whisper-cli";
const WHISPER_MODEL = "/home/lautaro/whisper.cpp/models/ggml-medium.bin";

function resolveInputPath(fileUrl: string): string {
  const relativePath = fileUrl.startsWith("/") ? fileUrl.slice(1) : fileUrl;
  return path.join(process.cwd(), "public", relativePath);
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

function removeTempDir(tempDir: string): void {
  try {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  } catch (error) {
    console.warn(`No se pudo eliminar el directorio temporal ${tempDir}:`, error);
  }
}

export async function processAssetWhisper(assetId: string): Promise<void> {
  const tempDir = path.join(os.tmpdir(), "deprocast", assetId);
  const wavPath = path.join(tempDir, `${assetId}.wav`);
  const txtPath = `${wavPath}.txt`;

  try {
    const asset = await prisma.audioAsset.findUnique({ where: { id: assetId } });

    if (!asset) {
      throw new Error(`AudioAsset ${assetId} no encontrado`);
    }

    const inputPath = resolveInputPath(asset.fileUrl);

    if (!fs.existsSync(inputPath)) {
      throw new Error(`Archivo de entrada no encontrado: ${inputPath}`);
    }

    fs.mkdirSync(tempDir, { recursive: true });

    await execAsync(
      `ffmpeg -i ${JSON.stringify(inputPath)} -ar 16000 -ac 1 -c:a pcm_s16le ${JSON.stringify(wavPath)}`,
    );

    await execAsync(
      `${JSON.stringify(WHISPER_CLI)} -m ${JSON.stringify(WHISPER_MODEL)} -f ${JSON.stringify(wavPath)} -l es -otxt`,
    );

    if (!fs.existsSync(txtPath)) {
      throw new Error(`Whisper no generó el archivo de transcripción: ${txtPath}`);
    }

    const rawText = fs.readFileSync(txtPath, "utf-8").trim();

    if (!rawText) {
      throw new Error("La transcripción está vacía");
    }

    await prisma.$transaction(async (tx) => {
      await tx.transcript.deleteMany({ where: { assetId } });

      await tx.transcript.create({
        data: {
          assetId,
          rawText,
        },
      });

      await tx.audioAsset.update({
        where: { id: assetId },
        data: { status: "COMPLETED" },
      });
    });
  } catch (error) {
    console.error(`Error procesando audio ${assetId}:`, error);

    await prisma.audioAsset
      .update({
        where: { id: assetId },
        data: { status: "ERROR" },
      })
      .catch(() => undefined);
  } finally {
    removeFile(wavPath);
    removeFile(txtPath);
    removeTempDir(tempDir);
  }
}

export function processAssetInBackground(assetId: string): void {
  void processAssetWhisper(assetId).catch((error) => {
    console.error(`Error no controlado procesando ${assetId}:`, error);
  });
}
