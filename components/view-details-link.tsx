import { Button } from "@/components/ui/button";
import Link from "next/link";

type ViewDetailsLinkProps = {
  assetId: string;
};

export function ViewDetailsLink({ assetId }: ViewDetailsLinkProps) {
  return (
    <Link href={`/audio/${assetId}`}>
      <Button size="sm" variant="outline">
        Ver Detalles
      </Button>
    </Link>
  );
}
