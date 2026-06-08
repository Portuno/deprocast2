"use client";

import { Button } from "@/components/ui/button";
import { Trash2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type DeleteAssetButtonProps = {
  assetId: string;
  filename: string;
  onDeleted: () => void;
  redirectTo?: string;
};

export function DeleteAssetButton({
  assetId,
  filename,
  onDeleted,
  redirectTo,
}: DeleteAssetButtonProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/assets/${assetId}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo eliminar el audio");
      }

      toast.success(data.message);

      if (redirectTo) {
        window.location.href = redirectTo;
        return;
      }

      onDeleted();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo eliminar el audio";
      toast.error(message);
    } finally {
      setIsDeleting(false);
      setIsConfirming(false);
    }
  }

  if (isConfirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          ¿Eliminar {filename}?
        </span>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => void handleDelete()}
          disabled={isDeleting}
        >
          {isDeleting ? "Eliminando..." : "Confirmar"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setIsConfirming(false)}
          disabled={isDeleting}
        >
          Cancelar
        </Button>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      className="text-destructive hover:text-destructive"
      onClick={() => setIsConfirming(true)}
    >
      <Trash2Icon className="size-3.5" />
      Eliminar
    </Button>
  );
}
