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
  PropertyUnitType,
  MovementType,
  MovementCategory,
  TaxStatus,
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

// Año opcional: viene como string del form; queda como number o null.
const optionalYearField = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === undefined || v === "" ? null : Number(v)))
  .refine(
    (v) => v === null || (Number.isInteger(v) && v >= 1800 && v <= 2100),
    { message: "Año inválido" },
  );

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
  m2Terreno: moneyField,
  m2Construidos: moneyField,
  anoConstruccion: optionalYearField,
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
    m2Terreno: formData.get("m2Terreno") ?? "",
    m2Construidos: formData.get("m2Construidos") ?? "",
    anoConstruccion: formData.get("anoConstruccion") ?? "",
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

// ---------------------------------------------------------------------------
// Anexos (estacionamientos y bodegas)
// ---------------------------------------------------------------------------

// Campo de texto opcional: "" del form queda como null.
const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === undefined || v === "" ? null : v));

const unitSchema = z.object({
  tipo: enumField(PropertyUnitType),
  numero: z.string().trim().min(1, "El número o identificador es obligatorio"),
  rolSII: optionalText,
  avaluoFiscal: moneyField,
});

export async function addUnit(
  _prev: PropertyFormState,
  formData: FormData,
): Promise<PropertyFormState> {
  const propertyId = String(formData.get("propertyId") ?? "");
  if (!propertyId) return { error: "Falta la propiedad." };

  const parsed = unitSchema.safeParse({
    tipo: formData.get("tipo"),
    numero: formData.get("numero"),
    rolSII: formData.get("rolSII") ?? "",
    avaluoFiscal: formData.get("avaluoFiscal") ?? "",
  });
  if (!parsed.success) {
    return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };
  }

  const orgId = await getOrgId();
  if (!(await assertProperty(propertyId, orgId)))
    return { error: "Propiedad no encontrada." };

  await db.propertyUnit.create({
    data: { organizationId: orgId, propertyId, ...parsed.data },
  });

  revalidatePath(`/propiedades/${propertyId}`);
  return {};
}

export async function removeUnit(formData: FormData): Promise<void> {
  const unitId = String(formData.get("unitId") ?? "");
  const propertyId = String(formData.get("propertyId") ?? "");
  if (!unitId) return;

  const orgId = await getOrgId();
  await db.propertyUnit.deleteMany({
    where: { id: unitId, organizationId: orgId },
  });
  revalidatePath(`/propiedades/${propertyId}`);
}

// ---------------------------------------------------------------------------
// Movimientos (ingresos / gastos)
// ---------------------------------------------------------------------------

const dateField = z
  .string()
  .trim()
  .min(1, "La fecha es obligatoria")
  .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)), {
    message: "Fecha inválida",
  })
  .transform((v) => new Date(`${v}T00:00:00Z`));

const requiredMoneyField = z
  .string()
  .trim()
  .min(1, "El monto es obligatorio")
  .refine((v) => !Number.isNaN(Number(v)) && Number(v) >= 0, {
    message: "Debe ser un número válido",
  });

export type MovementFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

const movementSchema = z.object({
  tipo: enumField(MovementType),
  categoria: enumField(MovementCategory),
  monto: requiredMoneyField,
  moneda: enumField(Currency),
  fecha: dateField,
  descripcion: optionalText,
});

export async function addMovement(
  _prev: MovementFormState,
  formData: FormData,
): Promise<MovementFormState> {
  const propertyId = String(formData.get("propertyId") ?? "");
  if (!propertyId) return { error: "Falta la propiedad." };

  const parsed = movementSchema.safeParse({
    tipo: formData.get("tipo"),
    categoria: formData.get("categoria"),
    monto: formData.get("monto"),
    moneda: formData.get("moneda"),
    fecha: formData.get("fecha"),
    descripcion: formData.get("descripcion") ?? "",
  });
  if (!parsed.success) {
    return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };
  }

  const orgId = await getOrgId();
  if (!(await assertProperty(propertyId, orgId)))
    return { error: "Propiedad no encontrada." };

  await db.movement.create({
    data: {
      organizationId: orgId,
      propertyId,
      tipo: parsed.data.tipo,
      categoria: parsed.data.categoria,
      monto: parsed.data.monto,
      moneda: parsed.data.moneda,
      fecha: parsed.data.fecha,
      descripcion: parsed.data.descripcion,
    },
  });

  revalidatePath(`/propiedades/${propertyId}`);
  return {};
}

export async function removeMovement(formData: FormData): Promise<void> {
  const movementId = String(formData.get("movementId") ?? "");
  const propertyId = String(formData.get("propertyId") ?? "");
  if (!movementId) return;

  const orgId = await getOrgId();
  await db.movement.deleteMany({
    where: { id: movementId, organizationId: orgId },
  });
  revalidatePath(`/propiedades/${propertyId}`);
}

// ---------------------------------------------------------------------------
// Contribuciones (impuesto territorial)
// ---------------------------------------------------------------------------

export type TaxFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

const taxSchema = z.object({
  anio: z
    .string()
    .trim()
    .min(1, "El año es obligatorio")
    .refine(
      (v) => Number.isInteger(Number(v)) && Number(v) >= 2000 && Number(v) <= 2100,
      { message: "Año inválido" },
    ),
  cuota: z
    .string()
    .trim()
    .min(1, "La cuota es obligatoria")
    .refine((v) => ["1", "2", "3", "4"].includes(v), {
      message: "La cuota debe ser 1, 2, 3 o 4",
    }),
  monto: requiredMoneyField,
  fechaVencimiento: dateField,
});

export async function addTax(
  _prev: TaxFormState,
  formData: FormData,
): Promise<TaxFormState> {
  const propertyId = String(formData.get("propertyId") ?? "");
  if (!propertyId) return { error: "Falta la propiedad." };

  const parsed = taxSchema.safeParse({
    anio: formData.get("anio"),
    cuota: formData.get("cuota"),
    monto: formData.get("monto"),
    fechaVencimiento: formData.get("fechaVencimiento"),
  });
  if (!parsed.success) {
    return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };
  }

  const orgId = await getOrgId();
  if (!(await assertProperty(propertyId, orgId)))
    return { error: "Propiedad no encontrada." };

  try {
    await db.propertyTax.create({
      data: {
        organizationId: orgId,
        propertyId,
        anio: Number(parsed.data.anio),
        cuota: Number(parsed.data.cuota),
        monto: parsed.data.monto,
        fechaVencimiento: parsed.data.fechaVencimiento,
        estado: TaxStatus.PENDIENTE,
      },
    });
  } catch {
    return { error: "Ya existe una contribución para ese año y cuota." };
  }

  revalidatePath(`/propiedades/${propertyId}`);
  return {};
}

export async function markTaxPaid(formData: FormData): Promise<void> {
  const taxId = String(formData.get("taxId") ?? "");
  const propertyId = String(formData.get("propertyId") ?? "");
  const fechaPagoStr = String(formData.get("fechaPago") ?? "");
  if (!taxId || !fechaPagoStr) return;

  const fechaPago = new Date(`${fechaPagoStr}T00:00:00Z`);
  if (Number.isNaN(fechaPago.getTime())) return;

  const orgId = await getOrgId();
  await db.propertyTax.updateMany({
    where: { id: taxId, organizationId: orgId },
    data: { estado: TaxStatus.PAGADA, fechaPago },
  });
  revalidatePath(`/propiedades/${propertyId}`);
}

export async function removeTax(formData: FormData): Promise<void> {
  const taxId = String(formData.get("taxId") ?? "");
  const propertyId = String(formData.get("propertyId") ?? "");
  if (!taxId) return;

  const orgId = await getOrgId();
  await db.propertyTax.deleteMany({
    where: { id: taxId, organizationId: orgId },
  });
  revalidatePath(`/propiedades/${propertyId}`);
}

// ---------------------------------------------------------------------------
// Avalúos fiscales (historial)
// ---------------------------------------------------------------------------

const assessmentSchema = z.object({
  anio: z
    .string()
    .trim()
    .min(1, "El año es obligatorio")
    .refine(
      (v) => Number.isInteger(Number(v)) && Number(v) >= 1800 && Number(v) <= 2100,
      { message: "Año inválido" },
    ),
  valor: requiredMoneyField,
});

export async function addAssessment(
  _prev: PropertyFormState,
  formData: FormData,
): Promise<PropertyFormState> {
  const propertyId = String(formData.get("propertyId") ?? "");
  if (!propertyId) return { error: "Falta la propiedad." };

  const parsed = assessmentSchema.safeParse({
    anio: formData.get("anio"),
    valor: formData.get("valor"),
  });
  if (!parsed.success) {
    return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };
  }

  const orgId = await getOrgId();
  if (!(await assertProperty(propertyId, orgId)))
    return { error: "Propiedad no encontrada." };

  try {
    await db.propertyAssessment.create({
      data: {
        organizationId: orgId,
        propertyId,
        anio: Number(parsed.data.anio),
        valor: parsed.data.valor,
      },
    });
  } catch {
    return { error: "Ya existe un avalúo para ese año." };
  }

  revalidatePath(`/propiedades/${propertyId}`);
  return {};
}

export async function removeAssessment(formData: FormData): Promise<void> {
  const assessmentId = String(formData.get("assessmentId") ?? "");
  const propertyId = String(formData.get("propertyId") ?? "");
  if (!assessmentId) return;

  const orgId = await getOrgId();
  await db.propertyAssessment.deleteMany({
    where: { id: assessmentId, organizationId: orgId },
  });
  revalidatePath(`/propiedades/${propertyId}`);
}
