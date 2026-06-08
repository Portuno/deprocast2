import { Button } from "@/components/ui/button";
import Link from "next/link";

type ViewDetailsLinkProps = {
  assetId: string;
  label?: string;
};

export function ViewDetailsLink({ assetId, label = "Ver Detalles" }: ViewDetailsLinkProps) {
  return (
    <Link href={`/audio/${assetId}`}>
      <Button size="sm" variant="outline">
        {label}
      </Button>
    </Link>
  );
}
