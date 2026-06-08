"use client";

import { StatusBadge } from "@/components/status-badge";
import { StopProcessButton } from "@/components/stop-process-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2Icon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type LiveTranscriptProps = {
  assetId: string;
  filename: string;
  initialStatus: string;
};

type AssetSnapshot = {
  status: string;
  partialText: string | null;
  transcript: { rawText: string } | null;
};

export function LiveTranscript({
  assetId,
  filename,
  initialStatus,
}: LiveTranscriptProps) {
  const [snapshot, setSnapshot] = useState<AssetSnapshot>({
    status: initialStatus,
    partialText: null,
    transcript: null,
  });
  const transcriptRef = useRef<HTMLPreElement>(null);

  const loadSnapshot = useCallback(async () => {
    try {
      const response = await fetch(`/api/assets/${assetId}`);
      const data = await response.json();

      if (!response.ok) return;

      setSnapshot({
        status: data.status,
        partialText: data.partialText ?? null,
        transcript: data.transcript ?? null,
      });
    } catch (error) {
      console.error(error);
    }
  }, [assetId]);

  useEffect(() => {
    if (snapshot.status !== "PROCESSING" && snapshot.status !== "PENDING") {
      return;
    }

    void loadSnapshot();

    const interval = setInterval(() => {
      void loadSnapshot();
    }, 1000);

    return () => clearInterval(interval);
  }, [loadSnapshot, snapshot.status]);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [snapshot.partialText, snapshot.transcript?.rawText]);

  if (snapshot.status === "COMPLETED" && snapshot.transcript) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transcripción</CardTitle>
          <CardDescription>Procesamiento completado.</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-4 text-sm leading-relaxed">
            {snapshot.transcript.rawText}
          </pre>
        </CardContent>
      </Card>
    );
  }

  if (snapshot.status === "PROCESSING" || snapshot.status === "PENDING") {
    return (
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2Icon className="size-5 animate-spin text-amber-600" />
            Transcripción en vivo
          </CardTitle>
          <CardDescription className="flex flex-wrap items-center gap-2">
            <span>{filename}</span>
            <StatusBadge status={snapshot.status} />
            <StopProcessButton
              assetId={assetId}
              onStopped={() => void loadSnapshot()}
            />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre
            ref={transcriptRef}
            className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg border bg-background p-4 text-sm leading-relaxed"
          >
            {snapshot.partialText?.trim() ||
              "Esperando los primeros segmentos de transcripción..."}
          </pre>
        </CardContent>
      </Card>
    );
  }

  if (snapshot.status === "ERROR") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error de procesamiento</CardTitle>
          <CardDescription>
            Hubo un problema al transcribir este audio. Volvé al dashboard para
            reintentar.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return null;
}
