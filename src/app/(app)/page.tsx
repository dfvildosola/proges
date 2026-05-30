import { Building2, Percent, Wallet, Bell } from "lucide-react";
import { PageHeader } from "@/components/page-header";

const kpis = [
  { label: "Propiedades", value: "—", icon: Building2 },
  { label: "Arrendadas", value: "—", icon: Percent },
  { label: "Ingreso del mes", value: "—", icon: Wallet },
  { label: "Alertas activas", value: "—", icon: Bell },
];

export default function InicioPage() {
  return (
    <>
      <PageHeader
        title="Inicio"
        description="Resumen de la cartera y qué necesita tu atención hoy."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {kpi.label}
                </span>
                <Icon className="size-4 text-muted-foreground" />
              </div>
              <p className="mt-2 text-2xl font-semibold">{kpi.value}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-8 rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        Aquí aparecerán las alertas activas (propiedades arrendadas sin contrato,
        arriendos atrasados, contribuciones impagas, contratos por vencer).
        Se construye en la Fase 5.
      </div>
    </>
  );
}
