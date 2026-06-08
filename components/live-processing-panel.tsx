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
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type ProcessStatus = {
  active: {
    id: string;
    filename: string;
    partialText: string | null;
    status: string;
  } | null;
  queuedIds: string[];
  queuedCount: number;
};

type LiveProcessingPanelProps = {
  refreshKey: number;
  onStopped?: () => void;
};

export function LiveProcessingPanel({
  refreshKey,
  onStopped,
}: LiveProcessingPanelProps) {
  const [status, setStatus] = useState<ProcessStatus | null>(null);
  const transcriptRef = useRef<HTMLPreElement>(null);

  const loadStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/process/status");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Error al cargar estado");
      }

      setStatus(data);
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus, refreshKey]);

  const isActive =
    status?.active?.status === "PROCESSING" || (status?.queuedCount ?? 0) > 0;

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const interval = setInterval(() => {
      void loadStatus();
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, loadStatus]);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [status?.active?.partialText]);

  if (!status || (!status.active && status.queuedCount === 0)) {
    return null;
  }

  const waitingCount = status.queuedCount;

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Loader2Icon className="size-5 animate-spin text-amber-600" />
          Procesamiento en vivo
        </CardTitle>
        <CardDescription>
          Los audios se procesan uno a uno. La transcripción aparece en tiempo
          real.
          {waitingCount > 0 &&
            ` · ${waitingCount} en cola`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status.active ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={`/audio/${status.active.id}`}
                className="font-medium hover:underline"
              >
                {status.active.filename}
              </Link>
              <StatusBadge status={status.active.status} />
              <StopProcessButton
                assetId={status.active.id}
                onStopped={() => {
                  void loadStatus();
                  onStopped?.();
                }}
              />
            </div>
            <pre
              ref={transcriptRef}
              className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border bg-background p-4 text-sm leading-relaxed"
            >
              {status.active.partialText?.trim() ||
                "Escuchando audio, esperando primeros segmentos..."}
            </pre>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Preparando el siguiente audio en la cola...
          </p>
        )}
      </CardContent>
    </Card>
  );
}
