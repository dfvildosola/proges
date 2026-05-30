import { FileText } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export default function ContratosPage() {
  return (
    <>
      <PageHeader
        title="Contratos"
        description="Los arriendos de la cartera: vigentes, por vencer, con sus datos de reajuste."
      />
      <EmptyState
        icon={FileText}
        title="Todavía no hay contratos"
        description="La gestión de contratos de arriendo (multimoneda, reajuste, estados) se construye en la Fase 3."
      />
    </>
  );
}
