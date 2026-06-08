"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CheckCircle2Icon, Loader2Icon, UploadCloudIcon, XCircleIcon } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

type UploadDropzoneProps = {
  onUploaded: () => void;
};

type FileUploadState = {
  file: File;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
};

export function UploadDropzone({ onUploaded }: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState<FileUploadState[]>([]);
  const isUploading = uploads.some((item) => item.status === "uploading");

  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (!files.length) return;

      const initial: FileUploadState[] = files.map((file) => ({
        file,
        status: "pending",
      }));

      setUploads(initial);

      let successCount = 0;
      let errorCount = 0;

      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];

        setUploads((current) =>
          current.map((item, itemIndex) =>
            itemIndex === index ? { ...item, status: "uploading" } : item,
          ),
        );

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

          successCount += 1;
          setUploads((current) =>
            current.map((item, itemIndex) =>
              itemIndex === index ? { ...item, status: "done" } : item,
            ),
          );
        } catch (error) {
          errorCount += 1;
          const message =
            error instanceof Error
              ? error.message
              : "No se pudo subir el archivo";

          setUploads((current) =>
            current.map((item, itemIndex) =>
              itemIndex === index
                ? { ...item, status: "error", error: message }
                : item,
            ),
          );
        }
      }

      if (successCount > 0) {
        onUploaded();
        toast.success(
          successCount === 1
            ? "1 audio subido correctamente"
            : `${successCount} audios subidos correctamente`,
        );
      }

      if (errorCount > 0) {
        toast.error(
          errorCount === 1
            ? "1 archivo falló al subir"
            : `${errorCount} archivos fallaron al subir`,
        );
      }

      setTimeout(() => setUploads([]), 4000);
    },
    [onUploaded],
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files?.length) return;
      void uploadFiles(Array.from(files));
    },
    [uploadFiles],
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
            Arrastrá audios o seleccioná varios archivos
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
          {isUploading ? "Subiendo..." : "Seleccionar archivos"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".mp3,.m4a,.wav,audio/*"
          className="hidden"
          onChange={(event) => {
            handleFiles(event.target.files);
            event.target.value = "";
          }}
        />

        {uploads.length > 0 && (
          <ul className="w-full max-w-md space-y-2 text-left text-sm">
            {uploads.map((item) => (
              <li
                key={`${item.file.name}-${item.file.size}`}
                className="flex items-center gap-2 rounded-md border px-3 py-2"
              >
                {item.status === "uploading" && (
                  <Loader2Icon className="size-4 shrink-0 animate-spin text-primary" />
                )}
                {item.status === "done" && (
                  <CheckCircle2Icon className="size-4 shrink-0 text-emerald-600" />
                )}
                {item.status === "error" && (
                  <XCircleIcon className="size-4 shrink-0 text-destructive" />
                )}
                {item.status === "pending" && (
                  <span className="size-4 shrink-0 rounded-full border" />
                )}
                <span className="min-w-0 flex-1 truncate">{item.file.name}</span>
                {item.error && (
                  <span className="text-xs text-destructive">{item.error}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
