"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  propertyTypeLabels,
  propertyStatusLabels,
  propertyGoalLabels,
  currencyLabels,
  enumOptions,
} from "@/lib/domain";
import type { PropertyFormState } from "./actions";

export type PropertyValues = {
  id?: string;
  rolSII?: string;
  tipo?: string;
  direccion?: string;
  comuna?: string;
  region?: string;
  objetivo?: string;
  estado?: string;
  monedaPrincipal?: string;
  avaluoFiscal?: string;
  valorComercial?: string;
};

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function PropertyForm({
  action,
  initial,
  submitLabel,
}: {
  action: (
    prev: PropertyFormState,
    fd: FormData,
  ) => Promise<PropertyFormState>;
  initial?: PropertyValues;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const err = (f: string) => state?.fieldErrors?.[f];

  return (
    <form action={formAction} className="max-w-2xl">
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos de la propiedad</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="ROL SII" htmlFor="rolSII" error={err("rolSII")}>
          <Input
            id="rolSII"
            name="rolSII"
            defaultValue={initial?.rolSII}
            placeholder="12345-6"
          />
        </Field>

        <Field label="Tipo" error={err("tipo")}>
          <Select name="tipo" defaultValue={initial?.tipo ?? "DEPARTAMENTO"}>
            <SelectTrigger>
              <SelectValue placeholder="Tipo de propiedad" />
            </SelectTrigger>
            <SelectContent>
              {enumOptions(propertyTypeLabels).map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Dirección" htmlFor="direccion" error={err("direccion")}>
          <Input
            id="direccion"
            name="direccion"
            defaultValue={initial?.direccion}
            placeholder="Av. Providencia 123, depto 45"
          />
        </Field>

        <Field label="Comuna" htmlFor="comuna" error={err("comuna")}>
          <Input
            id="comuna"
            name="comuna"
            defaultValue={initial?.comuna}
            placeholder="Providencia"
          />
        </Field>

        <Field label="Región" htmlFor="region" error={err("region")}>
          <Input
            id="region"
            name="region"
            defaultValue={initial?.region}
            placeholder="Metropolitana"
          />
        </Field>

        <Field label="Objetivo" error={err("objetivo")}>
          <Select name="objetivo" defaultValue={initial?.objetivo ?? "INVERSION"}>
            <SelectTrigger>
              <SelectValue placeholder="Objetivo" />
            </SelectTrigger>
            <SelectContent>
              {enumOptions(propertyGoalLabels).map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Estado" error={err("estado")}>
          <Select name="estado" defaultValue={initial?.estado ?? "DISPONIBLE"}>
            <SelectTrigger>
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              {enumOptions(propertyStatusLabels).map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Moneda principal" error={err("monedaPrincipal")}>
          <Select
            name="monedaPrincipal"
            defaultValue={initial?.monedaPrincipal ?? "CLP"}
          >
            <SelectTrigger>
              <SelectValue placeholder="Moneda" />
            </SelectTrigger>
            <SelectContent>
              {enumOptions(currencyLabels).map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field
          label="Avalúo fiscal (opcional)"
          htmlFor="avaluoFiscal"
          error={err("avaluoFiscal")}
        >
          <Input
            id="avaluoFiscal"
            name="avaluoFiscal"
            type="number"
            step="0.01"
            min="0"
            defaultValue={initial?.avaluoFiscal}
          />
        </Field>

        <Field
          label="Valor comercial (opcional)"
          htmlFor="valorComercial"
          error={err("valorComercial")}
        >
          <Input
            id="valorComercial"
            name="valorComercial"
            type="number"
            step="0.01"
            min="0"
            defaultValue={initial?.valorComercial}
          />
        </Field>
          </div>

          {state?.error && (
            <p className="mt-4 text-sm text-destructive">{state.error}</p>
          )}
        </CardContent>
        <CardFooter className="gap-3 border-t">
          <Button type="submit" disabled={pending}>
            {pending ? "Guardando…" : submitLabel}
          </Button>
          <Button variant="outline" render={<Link href="/propiedades" />}>
            Cancelar
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
