"use client";

import { DeleteAssetButton } from "@/components/delete-asset-button";
import { LiveProcessingPanel } from "@/components/live-processing-panel";
import { ProcessAllButton } from "@/components/process-all-button";
import { ProcessButton } from "@/components/process-button";
import { StopProcessButton } from "@/components/stop-process-button";
import { StatusBadge } from "@/components/status-badge";
import { ViewDetailsLink } from "@/components/view-details-link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { useCallback, useEffect, useState } from "react";

export type AudioAssetRow = {
  id: string;
  filename: string;
  originalCreatedAt: string;
  status: string;
};

type ProcessStatus = {
  active: { id: string } | null;
  queuedIds: string[];
  queuedCount: number;
};

type AssetsTableProps = {
  refreshKey: number;
};

export function AssetsTable({ refreshKey }: AssetsTableProps) {
  const [assets, setAssets] = useState<AudioAssetRow[]>([]);
  const [queueStatus, setQueueStatus] = useState<ProcessStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pollKey, setPollKey] = useState(0);

  const loadAssets = useCallback(async (silent = false) => {
    if (!silent) {
      setIsLoading(true);
    }

    try {
      const response = await fetch("/api/assets");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Error al cargar audios");
      }

      setAssets(data);
    } catch (error) {
      console.error(error);
      if (!silent) {
        setAssets([]);
      }
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, []);

  const loadQueueStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/process/status");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Error al cargar cola");
      }

      setQueueStatus(data);
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    void loadAssets();
    void loadQueueStatus();
  }, [loadAssets, loadQueueStatus, refreshKey]);

  const hasActiveWork =
    assets.some((asset) => asset.status === "PROCESSING") ||
    (queueStatus?.queuedCount ?? 0) > 0 ||
    (queueStatus?.active !== null && queueStatus?.active !== undefined);

  useEffect(() => {
    if (!hasActiveWork) {
      return;
    }

    const interval = setInterval(() => {
      void loadAssets(true);
      void loadQueueStatus();
      setPollKey((key) => key + 1);
    }, 1500);

    return () => clearInterval(interval);
  }, [hasActiveWork, loadAssets, loadQueueStatus]);

  const queuedIds = new Set(queueStatus?.queuedIds ?? []);
  const activeId = queueStatus?.active?.id;

  const pendingCount = assets.filter(
    (asset) =>
      (asset.status === "PENDING" || asset.status === "ERROR") &&
      !queuedIds.has(asset.id) &&
      asset.id !== activeId,
  ).length;

  function getDisplayStatus(asset: AudioAssetRow) {
    if (asset.status === "PROCESSING" || asset.id === activeId) {
      return "PROCESSING";
    }

    if (
      (asset.status === "PENDING" || asset.status === "ERROR") &&
      queuedIds.has(asset.id)
    ) {
      return "QUEUED";
    }

    return asset.status;
  }

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">Cargando audios...</p>
    );
  }

  if (assets.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no hay audios subidos. Arrastrá uno o varios arriba para
        empezar.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <LiveProcessingPanel
        refreshKey={refreshKey + pollKey}
        onStopped={() => {
          void loadAssets(true);
          void loadQueueStatus();
          setPollKey((key) => key + 1);
        }}
      />

      <div className="flex justify-end">
        <ProcessAllButton
          pendingCount={pendingCount}
          onQueued={() => {
            void loadAssets(true);
            void loadQueueStatus();
            setPollKey((key) => key + 1);
          }}
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Archivo</TableHead>
            <TableHead>Fecha original</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assets.map((asset) => {
            const displayStatus = getDisplayStatus(asset);
            const isQueued = displayStatus === "QUEUED";

            return (
              <TableRow key={asset.id}>
                <TableCell className="max-w-[240px] truncate font-medium">
                  {asset.filename}
                </TableCell>
                <TableCell>{formatDate(asset.originalCreatedAt)}</TableCell>
                <TableCell>
                  {isQueued ? (
                    <Badge variant="outline" className="text-muted-foreground">
                      En cola
                    </Badge>
                  ) : (
                    <StatusBadge status={displayStatus} />
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {(asset.status === "PENDING" || asset.status === "ERROR") &&
                      !isQueued &&
                      asset.id !== activeId && (
                        <ProcessButton
                          assetId={asset.id}
                          onProcessed={() => {
                            void loadAssets(true);
                            void loadQueueStatus();
                            setPollKey((key) => key + 1);
                          }}
                        />
                      )}
                    {displayStatus === "PROCESSING" && (
                      <>
                        <ViewDetailsLink
                          assetId={asset.id}
                          label="Ver en vivo"
                        />
                        <StopProcessButton
                          assetId={asset.id}
                          onStopped={() => {
                            void loadAssets(true);
                            void loadQueueStatus();
                            setPollKey((key) => key + 1);
                          }}
                        />
                      </>
                    )}
                    {asset.status === "COMPLETED" && (
                      <ViewDetailsLink assetId={asset.id} />
                    )}
                    {isQueued && (
                      <>
                        <span className="text-sm text-muted-foreground">
                          Esperando...
                        </span>
                        <StopProcessButton
                          assetId={asset.id}
                          label="Sacar de cola"
                          onStopped={() => {
                            void loadAssets(true);
                            void loadQueueStatus();
                            setPollKey((key) => key + 1);
                          }}
                        />
                      </>
                    )}
                    <DeleteAssetButton
                      assetId={asset.id}
                      filename={asset.filename}
                      onDeleted={() => {
                        void loadAssets(true);
                        void loadQueueStatus();
                        setPollKey((key) => key + 1);
                      }}
                    />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
