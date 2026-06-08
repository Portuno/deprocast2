"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { UploadCloudIcon } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

type UploadDropzoneProps = {
  onUploaded: () => void;
};

export function UploadDropzone({ onUploaded }: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const uploadFile = useCallback(
    async (file: File) => {
      setIsUploading(true);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "No se pudo subir el archivo");
        }

        toast.success(`"${data.filename}" subido correctamente`);
        onUploaded();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "No se pudo subir el archivo";
        toast.error(message);
      } finally {
        setIsUploading(false);
      }
    },
    [onUploaded],
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files?.length) return;
      void uploadFile(files[0]);
    },
    [uploadFile],
  );

  return (
    <Card
      className={cn(
        "border-dashed transition-colors",
        isDragging && "border-primary bg-primary/5",
      )}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        handleFiles(event.dataTransfer.files);
      }}
    >
      <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-muted">
          <UploadCloudIcon className="size-7 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="text-base font-medium">
            Arrastrá un audio o seleccioná un archivo
          </p>
          <p className="text-sm text-muted-foreground">
            Formatos permitidos: .mp3, .m4a, .wav
          </p>
        </div>
        <Button
          type="button"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
        >
          {isUploading ? "Subiendo..." : "Seleccionar archivo"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".mp3,.m4a,.wav,audio/*"
          className="hidden"
          onChange={(event) => {
            handleFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </CardContent>
    </Card>
  );
}
