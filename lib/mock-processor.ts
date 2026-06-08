import { prisma } from "@/lib/prisma";

const MOCK_TRANSCRIPT = `Hoy quiero hablar sobre la preproducción de El Fotographer, un proyecto audiovisual que estamos desarrollando para Deprocast. La clave está en el guion: cada escena debe tener intención cinematográfica, pensando en el ritmo narrativo y la paleta visual antes de grabar un solo frame. La cinematografía no es decoración, es parte del lenguaje que usa el director para contar la historia.

En la segunda parte de esta nota, repaso la arquitectura que estamos usando para Terreta Hub y Deprocast. Estamos construyendo sobre Next.js con App Router, desplegando en Ubuntu, y aplicando lo que llamamos Vibe Coding: iterar rápido con IA pero manteniendo estructura de datos sólida para búsqueda semántica. La comunidad tecnológica necesita herramientas que conviertan notas de voz largas en conocimiento accionable.`;

type MockParentChunk = {
  summary: string;
  content: string;
  startTimeMs: number;
  endTimeMs: number;
  children: string[];
  entities: { name: string; type: string }[];
  tags: string[];
};

const MOCK_PARENT_CHUNKS: MockParentChunk[] = [
  {
    summary: "Guiones y cinematografía en preproducción",
    content:
      "Bloque sobre la preproducción de El Fotographer: guion, ritmo narrativo y decisiones de cinematografía antes del rodaje.",
    startTimeMs: 0,
    endTimeMs: 125000,
    children: [
      "El guion de El Fotographer define la intención de cada escena antes del rodaje.",
      "La cinematografía es lenguaje narrativo, no solo estética visual.",
      "Deprocast documenta este proceso para reutilizar aprendizajes en futuros proyectos.",
    ],
    entities: [
      { name: "El Fotographer", type: "Project" },
      { name: "Deprocast", type: "Project" },
    ],
    tags: ["preproducción", "guion"],
  },
  {
    summary: "Arquitectura Next.js y comunidades tech",
    content:
      "Bloque sobre Terreta Hub, Next.js App Router, Ubuntu y Vibe Coding para convertir notas de voz en conocimiento estructurado.",
    startTimeMs: 125000,
    endTimeMs: 248000,
    children: [
      "Terreta Hub usa Next.js con App Router como base del stack de la comunidad.",
      "Ubuntu es el entorno de despliegue local y servidor para los prototipos.",
      "Vibe Coding combina iteración rápida con IA y modelos de datos preparados para RAG.",
    ],
    entities: [
      { name: "Terreta Hub", type: "Project" },
      { name: "Next.js", type: "Technology" },
      { name: "Ubuntu", type: "Technology" },
      { name: "Vibe Coding", type: "Technology" },
    ],
    tags: ["desarrollo", "comunidad"],
  },
  {
    summary: "Gestión de conocimiento en comunidades",
    content:
      "Reflexión sobre cómo las comunidades tecnológicas pueden estructurar notas de voz largas en conocimiento accionable.",
    startTimeMs: 248000,
    endTimeMs: 310000,
    children: [
      "Las notas de voz largas pierden valor si no se estructuran semánticamente.",
      "Parent-Child retrieval permite buscar ideas concretas dentro de contextos amplios.",
      "Deprocast es el laboratorio para probar este flujo antes de conectar IA real.",
    ],
    entities: [
      { name: "Deprocast", type: "Project" },
      { name: "Next.js", type: "Technology" },
    ],
    tags: ["comunidad", "preproducción"],
  },
];

type TransactionClient = Parameters<
  Parameters<typeof prisma.$transaction>[0]
>[0];

async function upsertEntity(
  tx: TransactionClient,
  name: string,
  type: string,
) {
  return tx.entity.upsert({
    where: { name },
    update: { type },
    create: { name, type },
  });
}

async function upsertTag(tx: TransactionClient, name: string) {
  return tx.tag.upsert({
    where: { name },
    update: {},
    create: { name },
  });
}

export async function processAssetMock(assetId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.transcript.deleteMany({ where: { assetId } });

    const transcript = await tx.transcript.create({
      data: {
        assetId,
        rawText: MOCK_TRANSCRIPT,
        confidence: 0.94,
      },
    });

    for (const parent of MOCK_PARENT_CHUNKS) {
      const parentChunk = await tx.parentChunk.create({
        data: {
          transcriptId: transcript.id,
          content: parent.content,
          startTimeMs: parent.startTimeMs,
          endTimeMs: parent.endTimeMs,
          summary: parent.summary,
          children: {
            create: parent.children.map((content) => ({ content })),
          },
        },
      });

      for (const entityData of parent.entities) {
        const entity = await upsertEntity(tx, entityData.name, entityData.type);
        await tx.parentChunkEntity.create({
          data: {
            parentChunkId: parentChunk.id,
            entityId: entity.id,
          },
        });
      }

      for (const tagName of parent.tags) {
        const tag = await upsertTag(tx, tagName);
        await tx.parentChunkTag.create({
          data: {
            parentChunkId: parentChunk.id,
            tagId: tag.id,
          },
        });
      }
    }

    await tx.audioAsset.update({
      where: { id: assetId },
      data: { status: "COMPLETED" },
    });
  });
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
