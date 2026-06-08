"use client";

import { AssetsTable } from "@/components/assets-table";
import { UploadDropzone } from "@/components/upload-dropzone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";

export function Dashboard() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10">
      <header className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">MVP local</p>
        <h1 className="text-3xl font-semibold tracking-tight">Deprocast</h1>
        <p className="max-w-2xl text-muted-foreground">
          Subí varios audios a la vez, procesalos en cola y seguí la
          transcripción en vivo mientras Whisper los transcribe.
        </p>
      </header>

      <UploadDropzone onUploaded={() => setRefreshKey((key) => key + 1)} />

      <Card>
        <CardHeader>
          <CardTitle>Audios ingestados</CardTitle>
        </CardHeader>
        <CardContent>
          <AssetsTable refreshKey={refreshKey} />
        </CardContent>
      </Card>
    </div>
  );
}
