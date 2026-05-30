import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/org";
import { PageHeader } from "@/components/page-header";
import { PropertyForm } from "../../property-form";
import { updateProperty } from "../../actions";

export default async function EditarPropiedadPage({
  params,
}: PageProps<"/propiedades/[id]/editar">) {
  const { id } = await params;
  const orgId = await getOrgId();
  const p = await db.property.findFirst({
    where: { id, organizationId: orgId },
  });
  if (!p) notFound();

  return (
    <>
      <Link
        href={`/propiedades/${p.id}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Volver a la ficha
      </Link>
      <PageHeader title="Editar propiedad" description={p.rolSII} />
      <PropertyForm
        action={updateProperty}
        submitLabel="Guardar cambios"
        initial={{
          id: p.id,
          rolSII: p.rolSII,
          tipo: p.tipo,
          direccion: p.direccion,
          comuna: p.comuna,
          region: p.region,
          objetivo: p.objetivo,
          estado: p.estado,
          monedaPrincipal: p.monedaPrincipal,
          avaluoFiscal: p.avaluoFiscal?.toString(),
          valorComercial: p.valorComercial?.toString(),
        }}
      />
    </>
  );
}
