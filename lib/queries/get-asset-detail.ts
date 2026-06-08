import { prisma } from "@/lib/prisma";

export async function getAssetDetail(id: string) {
  return prisma.audioAsset.findUnique({
    where: { id },
    include: {
      transcript: {
        include: {
          parentChunks: {
            orderBy: { startTimeMs: "asc" },
            include: {
              children: true,
              entities: { include: { entity: true } },
              tags: { include: { tag: true } },
            },
          },
        },
      },
    },
  });
}

export type AssetDetail = NonNullable<Awaited<ReturnType<typeof getAssetDetail>>>;
