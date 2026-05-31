import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/org";
import { BackLink } from "@/components/back-link";
import { PageHeader } from "@/components/page-header";
import { TenantForm } from "../../tenant-form";
import { updateTenant } from "../../actions";

export default async function EditarContactoPage({
  params,
}: PageProps<"/contactos/[id]/editar">) {
  const { id } = await params;
  const orgId = await getOrgId();
  const t = await db.tenant.findFirst({
    where: { id, organizationId: orgId },
  });
  if (!t) notFound();

  return (
    <>
      <BackLink href="/contactos">Contactos</BackLink>
      <PageHeader title="Editar contacto" description={t.nombre} />
      <TenantForm
        action={updateTenant}
        submitLabel="Guardar cambios"
        initial={{
          id: t.id,
          nombre: t.nombre,
          rut: t.rut,
          email: t.email ?? undefined,
          telefono: t.telefono ?? undefined,
        }}
      />
    </>
  );
}
