import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type AssetStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "ERROR";

const STATUS_CONFIG: Record<
  AssetStatus,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive"; className?: string }
> = {
  PENDING: { label: "Pendiente", variant: "outline" },
  PROCESSING: {
    label: "Procesando",
    variant: "default",
    className:
      "animate-pulse bg-amber-500/15 text-amber-700 dark:text-amber-400",
  },
  COMPLETED: {
    label: "Completado",
    variant: "secondary",
    className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  },
  ERROR: { label: "Error", variant: "destructive" },
};

export function StatusBadge({ status }: { status: string }) {
  const config =
    STATUS_CONFIG[status as AssetStatus] ?? {
      label: status,
      variant: "outline" as const,
    };

  return (
    <Badge variant={config.variant} className={cn(config.className)}>
      {config.label}
    </Badge>
  );
}
