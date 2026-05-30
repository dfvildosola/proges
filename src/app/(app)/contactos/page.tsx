import { Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export default function ContactosPage() {
  return (
    <>
      <PageHeader
        title="Contactos"
        description="Arrendatarios y propietarios de la cartera."
      />
      <EmptyState
        icon={Users}
        title="Todavía no hay contactos"
        description="Los arrendatarios y propietarios se administran aquí, vinculados a contratos y propiedades. Se construye en la Fase 3."
      />
    </>
  );
}
