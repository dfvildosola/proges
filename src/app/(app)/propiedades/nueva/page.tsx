import { BackLink } from "@/components/back-link";
import { PageHeader } from "@/components/page-header";
import { PropertyForm } from "../property-form";
import { createProperty } from "../actions";

export default function NuevaPropiedadPage() {
  return (
    <>
      <BackLink href="/propiedades">Propiedades</BackLink>
      <PageHeader
        title="Nueva propiedad"
        description="Carga una propiedad a tu cartera."
      />
      <PropertyForm action={createProperty} submitLabel="Crear propiedad" />
    </>
  );
}
