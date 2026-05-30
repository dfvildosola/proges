import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/org";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  propertyTypeLabels,
  propertyStatusLabels,
  propertyStatusVariant,
} from "@/lib/domain";

export default async function PropiedadesPage() {
  const orgId = await getOrgId();
  const properties = await db.property.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title="Propiedades"
          description="Tu cartera. Cada propiedad abre su ficha con documentos, contrato, económico y alertas."
        />
        <Button render={<Link href="/propiedades/nueva" />}>
          <Plus className="size-4" />
          Nueva propiedad
        </Button>
      </div>

      {properties.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Todavía no hay propiedades"
          description="Crea la primera propiedad para empezar a cargar tu cartera."
        />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ROL</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Dirección</TableHead>
                <TableHead>Comuna</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {properties.map((p) => (
                <TableRow key={p.id} className="cursor-pointer">
                  <TableCell className="font-medium">
                    <Link href={`/propiedades/${p.id}`} className="block">
                      {p.rolSII}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/propiedades/${p.id}`} className="block">
                      {propertyTypeLabels[p.tipo]}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/propiedades/${p.id}`} className="block">
                      {p.direccion}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/propiedades/${p.id}`} className="block">
                      {p.comuna}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/propiedades/${p.id}`} className="block">
                      <Badge variant={propertyStatusVariant(p.estado)}>
                        {propertyStatusLabels[p.estado]}
                      </Badge>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
