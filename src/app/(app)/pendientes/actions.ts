"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/org";
import { syncAlerts } from "@/lib/alerts";

export async function runSyncAlerts(): Promise<void> {
  const orgId = await getOrgId();
  await syncAlerts(orgId);
  revalidatePath("/");
  revalidatePath("/pendientes");
  revalidatePath("/", "layout");
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

  revalidatePath("/");
  revalidatePath("/pendientes");
  revalidatePath("/", "layout");
  if (propertyId) revalidatePath(`/propiedades/${propertyId}`);
}
