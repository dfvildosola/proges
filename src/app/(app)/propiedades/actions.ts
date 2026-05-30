"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/org";
import {
  PropertyType,
  PropertyStatus,
  PropertyGoal,
  Currency,
} from "@/generated/prisma/enums";

export type PropertyFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

// Un campo de dinero opcional: viene como string del form; queda como string (Decimal) o null.
const moneyField = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === undefined || v === "" ? null : v))
  .refine((v) => v === null || (!Number.isNaN(Number(v)) && Number(v) >= 0), {
    message: "Debe ser un número válido",
  });

// Preserva el tipo literal del enum (p. ej. PropertyType) en vez de `string`,
// para que el resultado de zod calce con el tipo que Prisma espera.
const enumField = <T extends Record<string, string>>(e: T) =>
  z.enum(Object.values(e) as [T[keyof T], ...T[keyof T][]]);

const propertySchema = z.object({
  rolSII: z.string().trim().min(1, "El ROL es obligatorio"),
  tipo: enumField(PropertyType),
  direccion: z.string().trim().min(1, "La dirección es obligatoria"),
  comuna: z.string().trim().min(1, "La comuna es obligatoria"),
  region: z.string().trim().min(1, "La región es obligatoria"),
  objetivo: enumField(PropertyGoal),
  estado: enumField(PropertyStatus),
  monedaPrincipal: enumField(Currency),
  avaluoFiscal: moneyField,
  valorComercial: moneyField,
});

function parse(formData: FormData) {
  return propertySchema.safeParse({
    rolSII: formData.get("rolSII"),
    tipo: formData.get("tipo"),
    direccion: formData.get("direccion"),
    comuna: formData.get("comuna"),
    region: formData.get("region"),
    objetivo: formData.get("objetivo"),
    estado: formData.get("estado"),
    monedaPrincipal: formData.get("monedaPrincipal"),
    avaluoFiscal: formData.get("avaluoFiscal") ?? "",
    valorComercial: formData.get("valorComercial") ?? "",
  });
}

function toFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

export async function createProperty(
  _prev: PropertyFormState,
  formData: FormData,
): Promise<PropertyFormState> {
  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };
  }

  const orgId = await getOrgId();
  const data = parsed.data;
  const created = await db.property.create({
    data: { ...data, organizationId: orgId },
  });

  revalidatePath("/propiedades");
  redirect(`/propiedades/${created.id}`);
}

export async function updateProperty(
  _prev: PropertyFormState,
  formData: FormData,
): Promise<PropertyFormState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Falta el identificador de la propiedad." };

  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };
  }

  const orgId = await getOrgId();
  // updateMany con where { id, organizationId } refuerza el aislamiento multi-tenant.
  const res = await db.property.updateMany({
    where: { id, organizationId: orgId },
    data: parsed.data,
  });
  if (res.count === 0) return { error: "Propiedad no encontrada." };

  revalidatePath("/propiedades");
  revalidatePath(`/propiedades/${id}`);
  redirect(`/propiedades/${id}`);
}

export async function deleteProperty(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const orgId = await getOrgId();
  await db.property.deleteMany({ where: { id, organizationId: orgId } });

  revalidatePath("/propiedades");
  redirect("/propiedades");
}
