"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

type ProcessButtonProps = {
  assetId: string;
  onProcessed: () => void;
};

export function ProcessButton({ assetId, onProcessed }: ProcessButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  async function handleProcess() {
    setIsProcessing(true);

    try {
      const response = await fetch(`/api/process/${assetId}`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo procesar el audio");
      }

      toast.success(
        data.message ?? "Audio agregado a la cola de procesamiento",
      );
      onProcessed();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo procesar el audio";
      toast.error(message);
      onProcessed();
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <Button
      size="sm"
      onClick={() => void handleProcess()}
      disabled={isProcessing}
    >
      {isProcessing ? "Procesando..." : "Procesar"}
    </Button>
  );
}
