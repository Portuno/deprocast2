"use client";

import { ProcessButton } from "@/components/process-button";
import { StatusBadge } from "@/components/status-badge";
import { ViewDetailsLink } from "@/components/view-details-link";
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

type AssetsTableProps = {
  refreshKey: number;
};

export function AssetsTable({ refreshKey }: AssetsTableProps) {
  const [assets, setAssets] = useState<AudioAssetRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  useEffect(() => {
    void loadAssets();
  }, [loadAssets, refreshKey]);

  const hasProcessing = assets.some((asset) => asset.status === "PROCESSING");

  useEffect(() => {
    if (!hasProcessing) {
      return;
    }

    const interval = setInterval(() => {
      void loadAssets(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [hasProcessing, loadAssets]);

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">Cargando audios...</p>
    );
  }

  if (assets.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no hay audios subidos. Arrastrá uno arriba para empezar.
      </p>
    );
  }

  return (
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
        {assets.map((asset) => (
          <TableRow key={asset.id}>
            <TableCell className="max-w-[240px] truncate font-medium">
              {asset.filename}
            </TableCell>
            <TableCell>{formatDate(asset.originalCreatedAt)}</TableCell>
            <TableCell>
              <StatusBadge status={asset.status} />
            </TableCell>
            <TableCell className="text-right">
              {asset.status === "PENDING" && (
                <ProcessButton assetId={asset.id} onProcessed={loadAssets} />
              )}
              {asset.status === "COMPLETED" && (
                <ViewDetailsLink assetId={asset.id} />
              )}
              {asset.status === "PROCESSING" && (
                <span className="text-sm text-muted-foreground">
                  En curso...
                </span>
              )}
              {asset.status === "ERROR" && (
                <ProcessButton assetId={asset.id} onProcessed={loadAssets} />
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
