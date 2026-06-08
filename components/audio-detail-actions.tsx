"use client";

import { DeleteAssetButton } from "@/components/delete-asset-button";
import { StopProcessButton } from "@/components/stop-process-button";

type AudioDetailActionsProps = {
  assetId: string;
  filename: string;
  status: string;
};

export function AudioDetailActions({
  assetId,
  filename,
  status,
}: AudioDetailActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "PROCESSING" && (
        <StopProcessButton
          assetId={assetId}
          onStopped={() => window.location.reload()}
        />
      )}
      <DeleteAssetButton
        assetId={assetId}
        filename={filename}
        onDeleted={() => undefined}
        redirectTo="/"
      />
    </div>
  );
}
