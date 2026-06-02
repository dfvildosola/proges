import Link from "next/link";
import { Bell, Wallet, Landmark, Building } from "lucide-react";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/org";
import { syncAlerts } from "@/lib/alerts";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  alertTypeLabels,
  alertTypeCategory,
  alertCategoryLabels,
  alertSeverityLabels,
  alertSeverityVariant,
  type AlertCategory,
} from "@/lib/domain";
import { formatDate } from "@/lib/format";
import { resolveAlert, resolvePropertyAlerts, resolveAllAlerts } from "./actions";

const categoryIcon: Record<AlertCategory, React.ReactNode> = {
  cobranza: <Wallet className="size-4 shrink-0 text-blue-500" />,
  contribuciones: <Landmark className="size-4 shrink-0 text-amber-500" />,
  propiedad: <Building className="size-4 shrink-0 text-slate-400" />,
};

const SEVERITY_ORDER = { ALTA: 0, MEDIA: 1, INFO: 2 } as const;

export default async function PendientesPage() {
  const orgId = await getOrgId();
  await syncAlerts(orgId);

  const alerts = await db.alert.findMany({
    where: { organizationId: orgId, estado: "ACTIVA" },
    include: {
      property: { select: { id: true, rolSII: true, direccion: true, comuna: true } },
      contract: { select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Agrupar por propiedad
  const groupMap = new Map<string | null, typeof alerts>();
  for (const alert of alerts) {
    const key = alert.propertyId ?? null;
    const group = groupMap.get(key) ?? [];
    group.push(alert);
    groupMap.set(key, group);
  }

  for (const group of groupMap.values()) {
    group.sort((a, b) => SEVERITY_ORDER[a.severidad] - SEVERITY_ORDER[b.severidad]);
  }

  const groups = [...groupMap.entries()].sort(([, a], [, b]) => {
    const worstA = Math.min(...a.map((x) => SEVERITY_ORDER[x.severidad]));
    const worstB = Math.min(...b.map((x) => SEVERITY_ORDER[x.severidad]));
    return worstA - worstB;
  });

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Pendientes"
          description="Alertas activas que requieren atención."
        />
        {alerts.length > 0 && (
          <form action={resolveAllAlerts}>
            <Button variant="outline" size="sm" type="submit">
              Resolver todas
            </Button>
          </form>
        )}
      </div>

      {alerts.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Sin alertas activas"
          description="Todo está en orden. Las alertas se recalculan automáticamente al abrir esta página."
        />
      ) : (
        <div className="mt-2 space-y-4">
          {groups.map(([propertyId, groupAlerts]) => {
            const property = groupAlerts[0]?.property ?? null;
            return (
              <div key={propertyId ?? "sin-propiedad"} className="rounded-xl border">
                <div className="flex items-center justify-between gap-4 border-b bg-muted/40 px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <Building className="size-4 shrink-0 text-muted-foreground" />
                    {property ? (
                      <Link
                        href={`/propiedades/${property.id}`}
                        className="text-sm font-medium underline-offset-2 hover:underline"
                      >
                        {property.rolSII} · {property.direccion}, {property.comuna}
                      </Link>
                    ) : (
                      <span className="text-sm font-medium text-muted-foreground">
                        Sin propiedad
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      ({groupAlerts.length}{" "}
                      {groupAlerts.length === 1 ? "alerta" : "alertas"})
                    </span>
                  </div>
                  {propertyId && (
                    <form action={resolvePropertyAlerts}>
                      <input type="hidden" name="propertyId" value={propertyId} />
                      <Button
                        variant="ghost"
                        size="sm"
                        type="submit"
                        className="h-7 text-xs"
                      >
                        Resolver propiedad
                      </Button>
                    </form>
                  )}
                </div>

                <div className="divide-y">
                  {groupAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start sm:justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {categoryIcon[alertTypeCategory[alert.tipo]]}
                          <Badge variant="outline" className="text-xs font-normal">
                            {alertCategoryLabels[alertTypeCategory[alert.tipo]]}
                          </Badge>
                          <Badge variant={alertSeverityVariant(alert.severidad)}>
                            {alertSeverityLabels[alert.severidad]}
                          </Badge>
                          <span className="text-sm font-medium">
                            {alertTypeLabels[alert.tipo]}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{alert.mensaje}</p>
                        {alert.contract && (
                          <Link
                            href={`/contratos/${alert.contract.id}`}
                            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                          >
                            Ver contrato →
                          </Link>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {formatDate(alert.createdAt)}
                        </p>
                      </div>
                      <form action={resolveAlert}>
                        <input type="hidden" name="alertId" value={alert.id} />
                        <input
                          type="hidden"
                          name="propertyId"
                          value={alert.propertyId ?? ""}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          type="submit"
                          className="shrink-0"
                        >
                          Resolver
                        </Button>
                      </form>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
