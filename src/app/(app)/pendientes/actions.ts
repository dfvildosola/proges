"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/org";

function revalidateAll(propertyId?: string) {
  revalidatePath("/");
  revalidatePath("/pendientes");
  revalidatePath("/", "layout");
  if (propertyId) revalidatePath(`/propiedades/${propertyId}`);
}

export async function resolveAlert(formData: FormData): Promise<void> {
  const alertId = String(formData.get("alertId") ?? "");
  const propertyId = String(formData.get("propertyId") ?? "");
  if (!alertId) return;

  const orgId = await getOrgId();
  await db.alert.updateMany({
    where: { id: alertId, organizationId: orgId, estado: "ACTIVA" },
    data: { estado: "RESUELTA", resolvedAt: new Date() },
  });

  revalidateAll(propertyId || undefined);
}

export async function resolvePropertyAlerts(formData: FormData): Promise<void> {
  const propertyId = String(formData.get("propertyId") ?? "");
  if (!propertyId) return;

  const orgId = await getOrgId();
  await db.alert.updateMany({
    where: { propertyId, organizationId: orgId, estado: "ACTIVA" },
    data: { estado: "RESUELTA", resolvedAt: new Date() },
  });

  revalidateAll(propertyId);
}

export async function resolveAllAlerts(): Promise<void> {
  const orgId = await getOrgId();
  await db.alert.updateMany({
    where: { organizationId: orgId, estado: "ACTIVA" },
    data: { estado: "RESUELTA", resolvedAt: new Date() },
  });

  revalidateAll();
}
