import { BackLink } from "@/components/back-link";
import { PageHeader } from "@/components/page-header";
import { TenantForm } from "../tenant-form";
import { createTenant } from "../actions";

export default function NuevoContactoPage() {
  return (
    <>
      <BackLink href="/contactos">Contactos</BackLink>
      <PageHeader
        title="Nuevo contacto"
        description="Registra un arrendatario para asociarlo a un contrato."
      />
      <TenantForm action={createTenant} submitLabel="Crear contacto" />
    </>
  );
}
