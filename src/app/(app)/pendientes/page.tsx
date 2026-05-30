import { Bell } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export default function PendientesPage() {
  return (
    <>
      <PageHeader
        title="Pendientes"
        description="El inbox del autocontrol: inconsistencias y vencimientos que requieren acción."
      />
      <EmptyState
        icon={Bell}
        title="Sin alertas por ahora"
        description="El motor de reglas (Fase 5) generará aquí las alertas: arrendada sin contrato, arriendo atrasado, contribución impaga, contrato por vencer."
      />
    </>
  );
}
