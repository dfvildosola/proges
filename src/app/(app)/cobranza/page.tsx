import { Wallet } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export default function CobranzaPage() {
  return (
    <>
      <PageHeader
        title="Cobranza"
        description="La corrida del mes: quién pagó, quién no, cuánto."
      />
      <EmptyState
        icon={Wallet}
        title="Aún no hay cobros"
        description="Cuando existan contratos, aquí se generan los cobros por período y su estado de pago. Se construye en la Fase 4."
      />
    </>
  );
}
