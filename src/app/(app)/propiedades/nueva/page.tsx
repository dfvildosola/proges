import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PropertyForm } from "../property-form";
import { createProperty } from "../actions";

export default function NuevaPropiedadPage() {
  return (
    <>
      <Link
        href="/propiedades"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Propiedades
      </Link>
      <PageHeader
        title="Nueva propiedad"
        description="Carga una propiedad a tu cartera."
      />
      <PropertyForm action={createProperty} submitLabel="Crear propiedad" />
    </>
  );
}
