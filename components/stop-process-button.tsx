"use client";

import { Button } from "@/components/ui/button";
import { SquareIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type StopProcessButtonProps = {
  assetId: string;
  onStopped: () => void;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost";
  label?: string;
};

export function StopProcessButton({
  assetId,
  onStopped,
  variant = "outline",
  label = "Detener",
}: StopProcessButtonProps) {
  const [isStopping, setIsStopping] = useState(false);

  async function handleStop() {
    setIsStopping(true);

    try {
      const response = await fetch(`/api/process/${assetId}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo detener el procesamiento");
      }

      toast.success(data.message);
      onStopped();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo detener el procesamiento";
      toast.error(message);
    } finally {
      setIsStopping(false);
    }
  }

  return (
    <Button
      size="sm"
      variant={variant}
      onClick={() => void handleStop()}
      disabled={isStopping}
    >
      <SquareIcon className="size-3.5" />
      {isStopping ? "Deteniendo..." : label}
    </Button>
  );
}
