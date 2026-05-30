"use client";

import { useActionState } from "react";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ownerTypeLabels, enumOptions } from "@/lib/domain";
import { addOwner, addTag } from "../actions";

export function AddOwnerForm({ propertyId }: { propertyId: string }) {
  const [state, formAction, pending] = useActionState(addOwner, {});
  const err = (f: string) => state?.fieldErrors?.[f];

  return (
    <form
      action={formAction}
      className="grid grid-cols-1 items-start gap-2 sm:grid-cols-[1fr_1fr_auto_auto_auto]"
    >
      <input type="hidden" name="propertyId" value={propertyId} />
      <div>
        <Input name="nombre" placeholder="Nombre o razón social" />
        {err("nombre") && (
          <p className="mt-1 text-xs text-destructive">{err("nombre")}</p>
        )}
      </div>
      <div>
        <Input name="rut" placeholder="RUT" />
        {err("rut") && (
          <p className="mt-1 text-xs text-destructive">{err("rut")}</p>
        )}
      </div>
      <Select name="tipo" defaultValue="PERSONA">
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {enumOptions(ownerTypeLabels).map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="w-24">
        <Input name="porcentaje" type="number" step="0.01" min="0" max="100" placeholder="%" />
        {err("porcentaje") && (
          <p className="mt-1 text-xs text-destructive">{err("porcentaje")}</p>
        )}
      </div>
      <Button type="submit" variant="outline" disabled={pending}>
        <Plus className="size-4" />
        Agregar
      </Button>
    </form>
  );
}

export function AddTagForm({ propertyId }: { propertyId: string }) {
  const [state, formAction, pending] = useActionState(addTag, {});

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="propertyId" value={propertyId} />
      <Input name="nombre" placeholder="Nueva etiqueta" className="h-8 w-48" />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        <Plus className="size-4" />
        Agregar
      </Button>
      {state?.fieldErrors?.nombre && (
        <span className="text-xs text-destructive">
          {state.fieldErrors.nombre}
        </span>
      )}
    </form>
  );
}
