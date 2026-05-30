"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteProperty } from "../actions";

export function DeletePropertyButton({ id }: { id: string }) {
  return (
    <form
      action={deleteProperty}
      onSubmit={(e) => {
        if (
          !confirm(
            "¿Eliminar esta propiedad? Se borran también sus contratos, documentos y movimientos. Esta acción no se puede deshacer.",
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <Button
        type="submit"
        variant="outline"
        className="text-destructive hover:text-destructive"
      >
        <Trash2 className="size-4" />
        Eliminar
      </Button>
    </form>
  );
}
