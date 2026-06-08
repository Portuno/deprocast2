import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function AudioNotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold">Audio no encontrado</h1>
      <p className="text-muted-foreground">
        El archivo que buscás no existe o fue eliminado.
      </p>
      <Link href="/">
        <Button>Volver al dashboard</Button>
      </Link>
    </div>
  );
}
