import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil } from "lucide-react";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/org";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  propertyTypeLabels,
  propertyStatusLabels,
  propertyGoalLabels,
  currencyLabels,
  propertyStatusVariant,
} from "@/lib/domain";
import { formatMoney } from "@/lib/format";
import { DeletePropertyButton } from "./delete-button";

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b py-3 last:border-0 sm:flex-row sm:justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function ComingSoon({ fase, children }: { fase: string; children: string }) {
  return (
    <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
      {children} <span className="text-foreground/70">({fase})</span>
    </div>
  );
}

export default async function PropiedadDetallePage({
  params,
}: PageProps<"/propiedades/[id]">) {
  const { id } = await params;
  const orgId = await getOrgId();
  const p = await db.property.findFirst({
    where: { id, organizationId: orgId },
  });
  if (!p) notFound();

  return (
    <>
      <Link
        href="/propiedades"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Propiedades
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {p.rolSII}
            </h1>
            <Badge variant={propertyStatusVariant(p.estado)}>
              {propertyStatusLabels[p.estado]}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {p.direccion}, {p.comuna}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            render={<Link href={`/propiedades/${p.id}/editar`} />}
          >
            <Pencil className="size-4" />
            Editar
          </Button>
          <DeletePropertyButton id={p.id} />
        </div>
      </div>

      <Tabs defaultValue="resumen">
        <TabsList className="flex-wrap">
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
          <TabsTrigger value="contrato">Contrato</TabsTrigger>
          <TabsTrigger value="economico">Económico</TabsTrigger>
          <TabsTrigger value="contribuciones">Contribuciones</TabsTrigger>
          <TabsTrigger value="alertas">Alertas</TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className="mt-4 max-w-2xl">
          <div className="rounded-lg border px-4">
            <DataRow label="Tipo" value={propertyTypeLabels[p.tipo]} />
            <DataRow label="Objetivo" value={propertyGoalLabels[p.objetivo]} />
            <DataRow label="Estado" value={propertyStatusLabels[p.estado]} />
            <DataRow label="Dirección" value={p.direccion} />
            <DataRow label="Comuna" value={p.comuna} />
            <DataRow label="Región" value={p.region} />
            <DataRow
              label="Moneda principal"
              value={currencyLabels[p.monedaPrincipal]}
            />
            <DataRow
              label="Avalúo fiscal"
              value={formatMoney(p.avaluoFiscal)}
            />
            <DataRow
              label="Valor comercial"
              value={formatMoney(p.valorComercial)}
            />
          </div>
        </TabsContent>

        <TabsContent value="documentos" className="mt-4">
          <ComingSoon fase="Fase: Documental">
            Aquí se suben y clasifican los documentos legales de la propiedad
            (escritura, dominio vigente, inscripción CBR, seguros).
          </ComingSoon>
        </TabsContent>

        <TabsContent value="contrato" className="mt-4">
          <ComingSoon fase="Fase 3">
            Aquí aparece el contrato de arriendo vigente de la propiedad y su
            historial.
          </ComingSoon>
        </TabsContent>

        <TabsContent value="economico" className="mt-4">
          <ComingSoon fase="Fase 4">
            Aquí van los ingresos y gastos de la propiedad, y su rentabilidad.
          </ComingSoon>
        </TabsContent>

        <TabsContent value="contribuciones" className="mt-4">
          <ComingSoon fase="Fase 4">
            Aquí se registran las contribuciones (impuesto territorial) por año y
            cuota.
          </ComingSoon>
        </TabsContent>

        <TabsContent value="alertas" className="mt-4">
          <ComingSoon fase="Fase 5">
            Aquí aparecen las alertas de autocontrol específicas de esta
            propiedad.
          </ComingSoon>
        </TabsContent>
      </Tabs>
    </>
  );
}
