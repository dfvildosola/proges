import Link from "next/link";
import { Bell, RefreshCw } from "lucide-react";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/org";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  alertTypeLabels,
  alertSeverityLabels,
  alertSeverityVariant,
} from "@/lib/domain";
import { formatDate } from "@/lib/format";
import { runSyncAlerts, resolveAlert } from "./actions";

const SEVERITY_ORDER = { ALTA: 0, MEDIA: 1, INFO: 2 } as const;

export default async function PendientesPage() {
  const orgId = await getOrgId();

  const alerts = await db.alert.findMany({
    where: { organizationId: orgId, estado: "ACTIVA" },
    include: {
      property: {
        select: { id: true, rolSII: true, direccion: true, comuna: true },
      },
      contract: { select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  alerts.sort(
    (a, b) => SEVERITY_ORDER[a.severidad] - SEVERITY_ORDER[b.severidad],
  );

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Pendientes"
          description="Alertas activas que requieren atención."
        />
        <form action={runSyncAlerts}>
          <Button variant="outline" size="sm" type="submit">
            <RefreshCw className="size-4" />
            Recalcular alertas
          </Button>
        </form>
      </div>

      {alerts.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Sin alertas activas"
          description="Todo está en orden. Usa 'Recalcular alertas' para revisar el estado actual de la cartera."
        />
      ) : (
        <div className="mt-2 divide-y rounded-xl border">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={alertSeverityVariant(alert.severidad)}>
                    {alertSeverityLabels[alert.severidad]}
                  </Badge>
                  <span className="text-sm font-medium">
                    {alertTypeLabels[alert.tipo]}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{alert.mensaje}</p>
                <div className="flex flex-wrap items-center gap-3">
                  {alert.property && (
                    <Link
                      href={`/propiedades/${alert.property.id}`}
                      className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                    >
                      {alert.property.rolSII} · {alert.property.direccion},{" "}
                      {alert.property.comuna}
                    </Link>
                  )}
                  {alert.contract && (
                    <Link
                      href={`/contratos/${alert.contract.id}`}
                      className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                    >
                      Ver contrato →
                    </Link>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDate(alert.createdAt)}
                </p>
              </div>
              <form action={resolveAlert}>
                <input type="hidden" name="alertId" value={alert.id} />
                <Button variant="outline" size="sm" type="submit" className="shrink-0">
                  Resolver
                </Button>
              </form>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
