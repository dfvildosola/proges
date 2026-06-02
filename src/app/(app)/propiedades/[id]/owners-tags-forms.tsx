"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import type { OwnerType } from "@/generated/prisma/enums";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ownerTypeLabels,
  propertyUnitTypeLabels,
  enumOptions,
} from "@/lib/domain";
import { addOwner, addTag, addUnit, addAssessment } from "../actions";

const NUEVA = "__nueva__";

type Entidad = { id: string; nombre: string; tipo: OwnerType };

export function AddOwnerForm({
  propertyId,
  entidades,
}: {
  propertyId: string;
  entidades: Entidad[];
}) {
  const [state, formAction, pending] = useActionState(addOwner, {});
  const err = (f: string) => state?.fieldErrors?.[f];
  const [sel, setSel] = useState(NUEVA);
  const isNew = sel === NUEVA;

  // Mapa valor→etiqueta para que el trigger muestre el nombre elegido.
  const items: Record<string, string> = { [NUEVA]: "➕ Nueva entidad" };
  for (const e of entidades)
    items[e.id] = `${e.nombre} · ${ownerTypeLabels[e.tipo]}`;

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="propertyId" value={propertyId} />
      <input type="hidden" name="ownerId" value={isNew ? "" : sel} />

      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-56 flex-1">
          <Select
            items={items}
            value={sel}
            onValueChange={(v) => setSel(v ?? NUEVA)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NUEVA}>➕ Nueva entidad</SelectItem>
              {entidades.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.nombre} · {ownerTypeLabels[e.tipo]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-24">
          <Input
            name="porcentaje"
            type="number"
            step="0.01"
            min="0"
            max="100"
            placeholder="%"
          />
          {err("porcentaje") && (
            <p className="mt-1 text-xs text-destructive">{err("porcentaje")}</p>
          )}
        </div>
        <Button type="submit" variant="outline" disabled={pending}>
          <Plus className="size-4" />
          Agregar
        </Button>
      </div>

      {isNew && (
        <div className="flex flex-wrap items-start gap-2">
          <div className="min-w-48 flex-1">
            <Input name="nombre" placeholder="Nombre o razón social" />
            {err("nombre") && (
              <p className="mt-1 text-xs text-destructive">{err("nombre")}</p>
            )}
          </div>
          <div className="min-w-32 flex-1">
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
        </div>
      )}

      {state?.error && (
        <p className="text-xs text-destructive">{state.error}</p>
      )}
    </form>
  );
}

export function AddUnitForm({ propertyId }: { propertyId: string }) {
  const [state, formAction, pending] = useActionState(addUnit, {});
  const err = (f: string) => state?.fieldErrors?.[f];

  return (
    <form
      action={formAction}
      className="grid grid-cols-1 items-start gap-2 sm:grid-cols-[auto_1fr_1fr_1fr_auto]"
    >
      <input type="hidden" name="propertyId" value={propertyId} />
      <Select name="tipo" defaultValue="ESTACIONAMIENTO">
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {enumOptions(propertyUnitTypeLabels).map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div>
        <Input name="numero" placeholder="N° o identificador" />
        {err("numero") && (
          <p className="mt-1 text-xs text-destructive">{err("numero")}</p>
        )}
      </div>
      <Input name="rolSII" placeholder="ROL SII (opcional)" />
      <div>
        <Input
          name="avaluoFiscal"
          type="number"
          step="0.01"
          min="0"
          placeholder="Avalúo (opcional)"
        />
        {err("avaluoFiscal") && (
          <p className="mt-1 text-xs text-destructive">{err("avaluoFiscal")}</p>
        )}
      </div>
      <Button type="submit" variant="outline" disabled={pending}>
        <Plus className="size-4" />
        Agregar
      </Button>
    </form>
  );
}

export function AddAssessmentForm({ propertyId }: { propertyId: string }) {
  const [state, formAction, pending] = useActionState(addAssessment, {});
  const err = (f: string) => state?.fieldErrors?.[f];

  return (
    <form
      action={formAction}
      className="grid grid-cols-1 items-start gap-2 sm:grid-cols-[auto_1fr_auto]"
    >
      <input type="hidden" name="propertyId" value={propertyId} />
      <div>
        <Input
          name="anio"
          type="number"
          step="1"
          min="1800"
          max="2100"
          placeholder="Año"
          className="w-24"
        />
        {err("anio") && (
          <p className="mt-1 text-xs text-destructive">{err("anio")}</p>
        )}
      </div>
      <div>
        <Input name="valor" type="number" step="0.01" min="0" placeholder="Valor ($)" />
        {err("valor") && (
          <p className="mt-1 text-xs text-destructive">{err("valor")}</p>
        )}
      </div>
      <Button type="submit" variant="outline" disabled={pending}>
        <Plus className="size-4" />
        Agregar
      </Button>
      {state?.error && (
        <p className="col-span-full text-xs text-destructive">{state.error}</p>
      )}
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
