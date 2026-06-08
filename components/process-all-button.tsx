"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

type ProcessAllButtonProps = {
  pendingCount: number;
  onQueued: () => void;
};

export function ProcessAllButton({
  pendingCount,
  onQueued,
}: ProcessAllButtonProps) {
  const [isQueuing, setIsQueuing] = useState(false);

  async function handleProcessAll() {
    setIsQueuing(true);

    try {
      const response = await fetch("/api/process/queue", { method: "POST" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo encolar el procesamiento");
      }

      if (data.added > 0) {
        toast.success(data.message);
      } else {
        toast.info(data.message);
      }

      onQueued();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo encolar el procesamiento";
      toast.error(message);
    } finally {
      setIsQueuing(false);
    }
  }

  if (pendingCount === 0) {
    return null;
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => void handleProcessAll()}
      disabled={isQueuing}
    >
      {isQueuing
        ? "Encolando..."
        : `Procesar todos (${pendingCount})`}
    </Button>
  );
}
