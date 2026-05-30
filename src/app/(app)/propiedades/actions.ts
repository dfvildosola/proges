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
  OwnerType,
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

// ---------------------------------------------------------------------------
// Dueños (copropiedad) y etiquetas
// ---------------------------------------------------------------------------

// Confirma que la propiedad pertenece a la organización activa. Devuelve null si no.
async function assertProperty(propertyId: string, orgId: string) {
  return db.property.findFirst({
    where: { id: propertyId, organizationId: orgId },
    select: { id: true },
  });
}

const ownerSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
  rut: z.string().trim().min(1, "El RUT es obligatorio"),
  tipo: enumField(OwnerType),
  porcentaje: z
    .string()
    .trim()
    .min(1, "El porcentaje es obligatorio")
    .refine(
      (v) => !Number.isNaN(Number(v)) && Number(v) > 0 && Number(v) <= 100,
      { message: "Debe ser un número entre 0 y 100" },
    ),
});

export async function addOwner(
  _prev: PropertyFormState,
  formData: FormData,
): Promise<PropertyFormState> {
  const propertyId = String(formData.get("propertyId") ?? "");
  if (!propertyId) return { error: "Falta la propiedad." };

  const parsed = ownerSchema.safeParse({
    nombre: formData.get("nombre"),
    rut: formData.get("rut"),
    tipo: formData.get("tipo"),
    porcentaje: formData.get("porcentaje"),
  });
  if (!parsed.success) {
    return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };
  }

  const orgId = await getOrgId();
  if (!(await assertProperty(propertyId, orgId)))
    return { error: "Propiedad no encontrada." };

  const { nombre, rut, tipo, porcentaje } = parsed.data;
  // En MVP cada alta crea un Owner nuevo (un selector de dueños existentes es post-MVP).
  const owner = await db.owner.create({
    data: { organizationId: orgId, nombre, rut, tipo },
  });
  await db.propertyOwner.create({
    data: { organizationId: orgId, propertyId, ownerId: owner.id, porcentaje },
  });

  revalidatePath(`/propiedades/${propertyId}`);
  return {};
}

export async function removeOwner(formData: FormData): Promise<void> {
  const propertyOwnerId = String(formData.get("propertyOwnerId") ?? "");
  const propertyId = String(formData.get("propertyId") ?? "");
  if (!propertyOwnerId) return;

  const orgId = await getOrgId();
  await db.propertyOwner.deleteMany({
    where: { id: propertyOwnerId, organizationId: orgId },
  });
  revalidatePath(`/propiedades/${propertyId}`);
}

const tagSchema = z.object({
  nombre: z.string().trim().min(1, "Escribe una etiqueta"),
});

export async function addTag(
  _prev: PropertyFormState,
  formData: FormData,
): Promise<PropertyFormState> {
  const propertyId = String(formData.get("propertyId") ?? "");
  if (!propertyId) return { error: "Falta la propiedad." };

  const parsed = tagSchema.safeParse({ nombre: formData.get("nombre") });
  if (!parsed.success) {
    return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };
  }

  const orgId = await getOrgId();
  if (!(await assertProperty(propertyId, orgId)))
    return { error: "Propiedad no encontrada." };

  // Crea la etiqueta si no existe (única por organización) y la vincula a la propiedad.
  const tag = await db.propertyTag.upsert({
    where: {
      organizationId_nombre: { organizationId: orgId, nombre: parsed.data.nombre },
    },
    create: { organizationId: orgId, nombre: parsed.data.nombre },
    update: {},
  });
  await db.property.update({
    where: { id: propertyId },
    data: { tags: { connect: { id: tag.id } } },
  });

  revalidatePath(`/propiedades/${propertyId}`);
  return {};
}

export async function removeTag(formData: FormData): Promise<void> {
  const propertyId = String(formData.get("propertyId") ?? "");
  const tagId = String(formData.get("tagId") ?? "");
  if (!propertyId || !tagId) return;

  const orgId = await getOrgId();
  if (!(await assertProperty(propertyId, orgId))) return;

  await db.property.update({
    where: { id: propertyId },
    data: { tags: { disconnect: { id: tagId } } },
  });
  revalidatePath(`/propiedades/${propertyId}`);
}
