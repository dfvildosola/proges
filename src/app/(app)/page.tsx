import { Building2, Percent, Wallet, Bell } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
            <Card key={kpi.label}>
              <CardHeader>
                <CardDescription className="flex items-center justify-between">
                  {kpi.label}
                  <Icon className="size-4" />
                </CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums">
                  {kpi.value}
                </CardTitle>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      <Card className="mt-8 border-dashed shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Alertas activas</CardTitle>
          <CardDescription>
            Aquí aparecerán las alertas activas (propiedades arrendadas sin
            contrato, arriendos atrasados, contribuciones impagas, contratos por
            vencer). Se construye en la Fase 5.
          </CardDescription>
        </CardHeader>
      </Card>
    </>
  );
}
