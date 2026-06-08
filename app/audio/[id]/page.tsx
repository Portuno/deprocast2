import { AudioDetailActions } from "@/components/audio-detail-actions";
import { LiveTranscript } from "@/components/live-transcript";
import { StatusBadge } from "@/components/status-badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate, formatDuration } from "@/lib/format";
import { getAssetDetail } from "@/lib/queries/get-asset-detail";
import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AudioDetailPage({ params }: PageProps) {
  const { id } = await params;
  const asset = await getAssetDetail(id);

  if (!asset) {
    notFound();
  }

  const parentChunks = asset.transcript?.parentChunks ?? [];

  const entities = Array.from(
    new Map(
      parentChunks
        .flatMap((chunk) => chunk.entities.map((item) => item.entity))
        .map((entity) => [entity.id, entity]),
    ).values(),
  );

  const tags = Array.from(
    new Map(
      parentChunks
        .flatMap((chunk) => chunk.tags.map((item) => item.tag))
        .map((tag) => [tag.id, tag]),
    ).values(),
  );

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-10">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftIcon className="size-4" />
            Volver al dashboard
          </Link>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">
              {asset.filename}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span>Original: {formatDate(asset.originalCreatedAt)}</span>
              <StatusBadge status={asset.status} />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {asset.status === "PENDING" && (
            <Link href="/">
              <Button variant="outline">Procesar desde el dashboard</Button>
            </Link>
          )}
          <AudioDetailActions
            assetId={asset.id}
            filename={asset.filename}
            status={asset.status}
          />
        </div>
      </div>

      {!asset.transcript ? (
        asset.status === "PROCESSING" || asset.status === "PENDING" ? (
          <LiveTranscript
            assetId={asset.id}
            filename={asset.filename}
            initialStatus={asset.status}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Sin procesar</CardTitle>
              <CardDescription>
                Este audio todavía no fue procesado. Volvé al dashboard y usá
                el botón Procesar.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/">
                <Button>Ir al dashboard</Button>
              </Link>
            </CardContent>
          </Card>
        )
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Metadatos detectados</CardTitle>
              <CardDescription>
                Entidades y tags asociados a los bloques semánticos del audio.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Entidades</p>
                <div className="flex flex-wrap gap-2">
                  {entities.length > 0 ? (
                    entities.map((entity) => (
                      <Badge key={entity.id} variant="secondary">
                        {entity.name}
                        <span className="text-muted-foreground">
                          · {entity.type}
                        </span>
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Sin entidades detectadas.
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {tags.length > 0 ? (
                    tags.map((tag) => (
                      <Badge key={tag.id} variant="outline">
                        {tag.name}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Sin tags detectados.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">Estructura semántica</h2>
              <p className="text-sm text-muted-foreground">
                Parent chunks con sus child chunks anidados.
              </p>
            </div>

            <Accordion className="rounded-xl border px-4">
              {parentChunks.map((parent) => (
                <AccordionItem key={parent.id} value={parent.id}>
                  <AccordionTrigger className="text-base font-medium">
                    <div className="flex flex-col items-start gap-1 text-left">
                      <span>{parent.summary}</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        {formatDuration(parent.startTimeMs)} –{" "}
                        {formatDuration(parent.endTimeMs)}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="mb-4 text-muted-foreground">{parent.content}</p>
                    <ul className="list-disc space-y-2 pl-5">
                      {parent.children.map((child) => (
                        <li key={child.id}>{child.content}</li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Transcript crudo</CardTitle>
              <CardDescription>
                Texto completo generado por el motor de simulación.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion>
                <AccordionItem value="raw-transcript">
                  <AccordionTrigger>Mostrar transcript original</AccordionTrigger>
                  <AccordionContent>
                    <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-4 text-sm leading-relaxed">
                      {asset.transcript.rawText}
                    </pre>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
