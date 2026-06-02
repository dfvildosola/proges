import { Bell } from "lucide-react";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/org";
import { syncAlerts } from "@/lib/alerts";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { resolveAllAlerts } from "./actions";
import { AlertGroup } from "./alert-group";

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
            const hasAlta = groupAlerts.some((a) => a.severidad === "ALTA");
            return (
              <AlertGroup
                key={propertyId ?? "sin-propiedad"}
                propertyId={propertyId}
                alerts={groupAlerts}
                defaultOpen={hasAlta}
              />
            );
          })}
        </div>
      )}
    </>
  );
}
