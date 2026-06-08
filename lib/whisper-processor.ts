import {
  isCancelled,
  ProcessingCancelledError,
  registerActiveJob,
  unregisterActiveJob,
} from "@/lib/processing-cancellation";
import { prisma } from "@/lib/prisma";
import { exec, spawn } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { promisify } from "util";
import readline from "readline";

const execAsync = promisify(exec);

const WHISPER_CLI = "/home/lautaro/whisper.cpp/build/bin/whisper-cli";
const WHISPER_MODEL = "/home/lautaro/whisper.cpp/models/ggml-medium.bin";
const WHISPER_PROMPT =
  "Esta es una transcripción en español de una entrevista, nota de voz o proyecto:";

const SEGMENT_REGEX =
  /^\[(\d{2}:\d{2}:\d{2}\.\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2}\.\d{3})\]\s+(.+)$/;

function resolveInputPath(fileUrl: string): string {
  const relativePath = fileUrl.startsWith("/") ? fileUrl.slice(1) : fileUrl;
  return path.resolve(process.cwd(), "public", relativePath);
}

function removeFile(filePath: string, label?: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Eliminado ${label ?? "archivo"}: ${filePath}`);
    }
  } catch (error) {
    console.warn(`No se pudo eliminar ${filePath}:`, error);
  }
}

function removeTempDir(tempDir: string): void {
  try {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      console.log(`Directorio temporal eliminado: ${tempDir}`);
    }
  } catch (error) {
    console.warn(`No se pudo eliminar el directorio temporal ${tempDir}:`, error);
  }
}

async function updatePartialText(
  assetId: string,
  partialText: string,
): Promise<void> {
  await prisma.audioAsset.update({
    where: { id: assetId },
    data: { partialText },
  });
}

async function runWhisperWithLiveOutput(
  assetId: string,
  wavPath: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const segments: string[] = [];
    let lastDbUpdate = 0;
    let flushTimer: ReturnType<typeof setTimeout> | null = null;

    const flushPartial = () => {
      const text = segments.join(" ").trim();
      if (!text) return;

      const now = Date.now();
      if (now - lastDbUpdate < 400) return;

      lastDbUpdate = now;
      void updatePartialText(assetId, text).catch((error) => {
        console.warn(`No se pudo actualizar partialText de ${assetId}:`, error);
      });
    };

    const scheduleFlush = () => {
      if (flushTimer) return;
      flushTimer = setTimeout(() => {
        flushTimer = null;
        flushPartial();
      }, 400);
    };

    const child = spawn(
      WHISPER_CLI,
      [
        "-m",
        WHISPER_MODEL,
        "-f",
        wavPath,
        "-l",
        "es",
        "-otxt",
        "--prompt",
        WHISPER_PROMPT,
        "--entropy-thold",
        "2.8",
        "-sns",
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );

    registerActiveJob(assetId, () => {
      child.kill("SIGTERM");
    });

    const stdout = child.stdout;
    if (!stdout) {
      reject(new Error("Whisper no expuso stdout"));
      return;
    }

    const rl = readline.createInterface({ input: stdout });

    rl.on("line", (line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      const match = trimmed.match(SEGMENT_REGEX);
      if (match) {
        segments.push(match[3].trim());
        scheduleFlush();
      }
    });

    let stderr = "";
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      if (flushTimer) clearTimeout(flushTimer);
      reject(error);
    });

    child.on("close", (code) => {
      if (flushTimer) clearTimeout(flushTimer);
      flushPartial();

      if (isCancelled(assetId)) {
        reject(new ProcessingCancelledError());
        return;
      }

      if (code !== 0) {
        reject(
          new Error(
            `whisper-cli salió con código ${code}${stderr ? `: ${stderr.slice(-500)}` : ""}`,
          ),
        );
        return;
      }

      const rawText = segments.join(" ").trim();

      if (!rawText && /unknown argument|error:/i.test(stderr)) {
        reject(
          new Error(
            `whisper-cli falló silenciosamente: ${stderr.slice(-500)}`,
          ),
        );
        return;
      }

      resolve(rawText);
    });
  });
}

async function markAssetError(assetId: string, reason: string): Promise<void> {
  console.error(`[${assetId}] Marcando AudioAsset como ERROR: ${reason}`);
  await prisma.audioAsset
    .update({
      where: { id: assetId },
      data: { status: "ERROR", partialText: null },
    })
    .catch((error) => {
      console.error(`[${assetId}] No se pudo actualizar el estado a ERROR:`, error);
    });
}

export async function processAssetWhisper(assetId: string): Promise<void> {
  const tempDir = path.resolve(os.tmpdir(), "deprocast", assetId);
  const wavPath = path.resolve(tempDir, `${assetId}.wav`);
  const txtPath = `${wavPath}.txt`;
  let inputPath: string | null = null;

  try {
    console.log(`[${assetId}] Iniciando procesamiento de audio...`);

    const asset = await prisma.audioAsset.findUnique({ where: { id: assetId } });

    if (!asset) {
      throw new Error(`AudioAsset ${assetId} no encontrado`);
    }

    inputPath = resolveInputPath(asset.fileUrl);
    console.log(`[${assetId}] Ruta de entrada resuelta: ${inputPath}`);

    if (!fs.existsSync(inputPath)) {
      throw new Error(
        `Archivo de entrada no encontrado en disco: ${inputPath}`,
      );
    }

    fs.mkdirSync(tempDir, { recursive: true });
    console.log(`[${assetId}] Directorio temporal creado: ${tempDir}`);

    const ffmpegCmd = [
      "ffmpeg -y",
      `-i ${JSON.stringify(inputPath)}`,
      "-ar 16000 -ac 1 -c:a pcm_s16le",
      '-af "highpass=f=200,lowpass=f=3000,afftdn"',
      JSON.stringify(wavPath),
    ].join(" ");

    console.log(`[${assetId}] Iniciando FFmpeg...`);
    console.log(`[${assetId}] Comando: ${ffmpegCmd}`);

    try {
      const { stderr: ffmpegStderr } = await execAsync(ffmpegCmd);
      if (ffmpegStderr) {
        console.log(`[${assetId}] FFmpeg stderr: ${ffmpegStderr.slice(-300)}`);
      }
    } catch (ffmpegError) {
      const message =
        ffmpegError instanceof Error ? ffmpegError.message : String(ffmpegError);
      throw new Error(`FFmpeg falló al convertir el audio: ${message}`);
    }

    if (!fs.existsSync(wavPath)) {
      throw new Error(
        `FFmpeg no generó el archivo WAV esperado: ${wavPath}. ` +
          "Verifica que FFmpeg esté instalado y que la ruta de entrada sea válida.",
      );
    }

    if (isCancelled(assetId)) {
      throw new ProcessingCancelledError();
    }

    const wavStats = fs.statSync(wavPath);
    console.log(
      `[${assetId}] WAV verificado (${wavStats.size} bytes), iniciando Whisper...`,
    );

    if (isCancelled(assetId)) {
      throw new ProcessingCancelledError();
    }

    let rawText = await runWhisperWithLiveOutput(assetId, wavPath);
    console.log(`[${assetId}] Whisper finalizó.`);

    if (!rawText && fs.existsSync(txtPath)) {
      console.log(`[${assetId}] Leyendo transcripción desde archivo .txt...`);
      rawText = fs.readFileSync(txtPath, "utf-8").trim();
    }

    if (!rawText) {
      throw new Error(
        "La transcripción está vacía tras la ejecución de Whisper. " +
          "Verifica que whisper-cli acepte todos los flags del comando.",
      );
    }

    console.log(
      `[${assetId}] Transcripción obtenida (${rawText.length} caracteres), guardando en base de datos...`,
    );

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
        data: { status: "COMPLETED", partialText: null },
      });
    });

    console.log(`[${assetId}] Transcripción guardada. Iniciando limpieza de archivos...`);

    removeFile(wavPath, "WAV temporal");
    if (inputPath) {
      removeFile(inputPath, "archivo de entrada original");
    }
  } catch (error) {
    if (error instanceof ProcessingCancelledError || isCancelled(assetId)) {
      console.log(`[${assetId}] Procesamiento cancelado por el usuario.`);
      await prisma.audioAsset
        .update({
          where: { id: assetId },
          data: { status: "PENDING", partialText: null },
        })
        .catch(() => undefined);
      return;
    }

    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${assetId}] Error procesando audio: ${message}`, error);
    await markAssetError(assetId, message);
  } finally {
    unregisterActiveJob(assetId);
    removeFile(txtPath, "TXT temporal");
    removeFile(wavPath, "WAV residual");
    removeTempDir(tempDir);
  }
}
