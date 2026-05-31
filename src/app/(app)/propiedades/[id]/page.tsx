import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, X, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/org";
import { BackLink } from "@/components/back-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  propertyTypeLabels,
  propertyStatusLabels,
  propertyGoalLabels,
  currencyLabels,
  ownerTypeLabels,
  propertyStatusVariant,
  propertyUnitTypeLabels,
  contractStatusLabels,
  contractStatusVariant,
  movementTypeLabels,
  movementCategoryLabels,
  taxStatusLabels,
  movementTypeVariant,
  taxStatusVariant,
} from "@/lib/domain";
import { formatMoney, formatDate } from "@/lib/format";
import { DeletePropertyButton } from "./delete-button";
import { AddOwnerForm, AddTagForm, AddUnitForm } from "./owners-tags-forms";
import { AddMovementForm, AddTaxForm } from "./economic-forms";
import {
  removeOwner,
  removeTag,
  removeUnit,
  removeMovement,
  markTaxPaid,
  removeTax,
} from "../actions";

// Par etiqueta/valor dentro de una grilla de definición.
function DataItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 py-2">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

// Placeholder con estilo para las pestañas que se construyen en fases siguientes.
function ComingSoon({ fase, children }: { fase: string; children: string }) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-xl border border-dashed bg-muted/30 p-6">
      <Badge variant="secondary">{fase}</Badge>
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

const TABS = [
  { value: "resumen", label: "Resumen" },
  { value: "documentos", label: "Documentos" },
  { value: "contrato", label: "Contrato" },
  { value: "economico", label: "Económico" },
  { value: "contribuciones", label: "Contribuciones" },
  { value: "alertas", label: "Alertas" },
];

export default async function PropiedadDetallePage({
  params,
}: PageProps<"/propiedades/[id]">) {
  const { id } = await params;
  const orgId = await getOrgId();
  const p = await db.property.findFirst({
    where: { id, organizationId: orgId },
    include: {
      owners: { include: { owner: true }, orderBy: { porcentaje: "desc" } },
      tags: { orderBy: { nombre: "asc" } },
      units: { orderBy: [{ tipo: "asc" }, { numero: "asc" }] },
      contracts: {
        include: { tenant: { select: { nombre: true, rut: true } } },
        orderBy: { fechaInicio: "desc" },
      },
      movements: { orderBy: { fecha: "desc" } },
      taxes: { orderBy: [{ anio: "desc" }, { cuota: "asc" }] },
    },
  });
  if (!p) notFound();

  const totalPorcentaje = p.owners.reduce(
    (sum, po) => sum + Number(po.porcentaje),
    0,
  );

  return (
    <>
      <BackLink href="/propiedades">Propiedades</BackLink>

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
        <div className="flex items-center gap-2">
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
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="resumen" className="mt-6 max-w-3xl space-y-6">
          {/* Datos de la propiedad */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Datos de la propiedad</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-x-8 sm:grid-cols-2">
                <DataItem label="Tipo" value={propertyTypeLabels[p.tipo]} />
                <DataItem
                  label="Objetivo"
                  value={propertyGoalLabels[p.objetivo]}
                />
                <DataItem label="Dirección" value={p.direccion} />
                <DataItem label="Comuna" value={p.comuna} />
                <DataItem label="Región" value={p.region} />
                <DataItem
                  label="Moneda principal"
                  value={currencyLabels[p.monedaPrincipal]}
                />
                <DataItem
                  label="Avalúo fiscal"
                  value={formatMoney(p.avaluoFiscal)}
                />
                <DataItem
                  label="Valor comercial"
                  value={formatMoney(p.valorComercial)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Dueños (copropiedad) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dueños</CardTitle>
              {p.owners.length > 0 && (
                <Badge
                  variant={totalPorcentaje === 100 ? "outline" : "secondary"}
                >
                  {totalPorcentaje}% asignado
                </Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {p.owners.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Sin dueños cargados.
                </p>
              ) : (
                <div className="divide-y rounded-lg border">
                  {p.owners.map((po) => (
                    <div
                      key={po.id}
                      className="flex items-center justify-between px-3 py-2.5"
                    >
                      <div>
                        <span className="text-sm font-medium">
                          {po.owner.nombre}
                        </span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {ownerTypeLabels[po.owner.tipo]} · {po.owner.rut}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium tabular-nums">
                          {Number(po.porcentaje)}%
                        </span>
                        <form action={removeOwner}>
                          <input
                            type="hidden"
                            name="propertyOwnerId"
                            value={po.id}
                          />
                          <input
                            type="hidden"
                            name="propertyId"
                            value={p.id}
                          />
                          <button
                            type="submit"
                            aria-label="Quitar dueño"
                            className="text-muted-foreground transition-colors hover:text-destructive"
                          >
                            <X className="size-4" />
                          </button>
                        </form>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <CardFooter className="border-t">
              <AddOwnerForm propertyId={p.id} />
            </CardFooter>
          </Card>

          {/* Etiquetas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Etiquetas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {p.tags.length === 0 ? (
                  <span className="text-sm text-muted-foreground">
                    Sin etiquetas.
                  </span>
                ) : (
                  p.tags.map((t) => (
                    <Badge key={t.id} variant="secondary" className="gap-1 pr-1">
                      {t.nombre}
                      <form action={removeTag} className="inline-flex">
                        <input type="hidden" name="propertyId" value={p.id} />
                        <input type="hidden" name="tagId" value={t.id} />
                        <button
                          type="submit"
                          aria-label={`Quitar ${t.nombre}`}
                          className="text-muted-foreground transition-colors hover:text-destructive"
                        >
                          <X className="size-3" />
                        </button>
                      </form>
                    </Badge>
                  ))
                )}
              </div>
              <AddTagForm propertyId={p.id} />
            </CardContent>
          </Card>

          {/* Anexos (estacionamientos y bodegas) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Anexos (estacionamientos y bodegas)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {p.units.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Sin estacionamientos ni bodegas cargados.
                </p>
              ) : (
                <div className="divide-y rounded-lg border">
                  {p.units.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between px-3 py-2.5"
                    >
                      <div>
                        <span className="text-sm font-medium">
                          {propertyUnitTypeLabels[u.tipo]} {u.numero}
                        </span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {u.rolSII ? `ROL ${u.rolSII}` : "Sin ROL"}
                          {u.avaluoFiscal != null &&
                            ` · av. ${formatMoney(u.avaluoFiscal)}`}
                        </span>
                      </div>
                      <form action={removeUnit}>
                        <input type="hidden" name="unitId" value={u.id} />
                        <input type="hidden" name="propertyId" value={p.id} />
                        <button
                          type="submit"
                          aria-label="Quitar anexo"
                          className="text-muted-foreground transition-colors hover:text-destructive"
                        >
                          <X className="size-4" />
                        </button>
                      </form>
                    </div>
                  ))}
                </div>
              )}
              <AddUnitForm propertyId={p.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documentos" className="mt-6">
          <ComingSoon fase="Fase: Documental">
            Aquí se suben y clasifican los documentos legales de la propiedad
            (escritura, dominio vigente, inscripción CBR, seguros).
          </ComingSoon>
        </TabsContent>

        <TabsContent value="contrato" className="mt-6 max-w-3xl">
          {p.contracts.length === 0 ? (
            <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed bg-muted/30 p-6">
              <p className="text-sm text-muted-foreground">
                Esta propiedad no tiene contratos de arriendo cargados.
              </p>
              <Button
                size="sm"
                render={
                  <Link href={`/contratos/nuevo?propertyId=${p.id}`} />
                }
              >
                <Plus className="size-4" />
                Nuevo contrato
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {p.contracts.length}{" "}
                  {p.contracts.length === 1 ? "contrato" : "contratos"} en esta
                  propiedad.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  render={<Link href={`/contratos/nuevo?propertyId=${p.id}`} />}
                >
                  <Plus className="size-4" />
                  Nuevo contrato
                </Button>
              </div>
              <div className="divide-y rounded-lg border">
                {p.contracts.map((c) => (
                  <Link
                    key={c.id}
                    href={`/contratos/${c.id}`}
                    className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-muted/50"
                  >
                    <div>
                      <span className="text-sm font-medium tabular-nums">
                        {formatMoney(c.monto, c.moneda)}
                      </span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {c.tenant.nombre}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {formatDate(c.fechaInicio)} → {formatDate(c.fechaTermino)}
                      </span>
                    </div>
                    <Badge variant={contractStatusVariant(c.estado)}>
                      {contractStatusLabels[c.estado]}
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="economico" className="mt-6 max-w-3xl">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Movimientos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {p.movements.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Sin movimientos registrados.
                </p>
              ) : (
                <div className="divide-y rounded-lg border">
                  {p.movements.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-start justify-between px-3 py-2.5"
                    >
                      <div>
                        <span className="text-sm font-medium tabular-nums">
                          {formatMoney(m.monto, m.moneda)}
                        </span>
                        <Badge
                          variant={movementTypeVariant(m.tipo)}
                          className="ml-2 text-xs"
                        >
                          {movementTypeLabels[m.tipo]}
                        </Badge>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {movementCategoryLabels[m.categoria]}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {formatDate(m.fecha)}
                          {m.descripcion && ` · ${m.descripcion}`}
                        </span>
                      </div>
                      <form action={removeMovement}>
                        <input type="hidden" name="movementId" value={m.id} />
                        <input type="hidden" name="propertyId" value={p.id} />
                        <button
                          type="submit"
                          aria-label="Quitar movimiento"
                          className="text-muted-foreground transition-colors hover:text-destructive"
                        >
                          <X className="size-4" />
                        </button>
                      </form>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <CardFooter className="border-t">
              <AddMovementForm propertyId={p.id} />
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="contribuciones" className="mt-6 max-w-3xl">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contribuciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {p.taxes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Sin contribuciones registradas.
                </p>
              ) : (
                <div className="divide-y rounded-lg border">
                  {p.taxes.map((t) => (
                    <div
                      key={t.id}
                      className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <span className="text-sm font-medium">
                          Cuota {t.cuota} · {t.anio}
                        </span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {formatMoney(t.monto)} · vence{" "}
                          {formatDate(t.fechaVencimiento)}
                        </span>
                        {t.estado === "PAGADA" && t.fechaPago && (
                          <span className="block text-xs text-muted-foreground">
                            Pagada el {formatDate(t.fechaPago)}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={taxStatusVariant(t.estado)}>
                          {taxStatusLabels[t.estado]}
                        </Badge>
                        {t.estado === "PENDIENTE" && (
                          <form
                            action={markTaxPaid}
                            className="flex items-center gap-1"
                          >
                            <input type="hidden" name="taxId" value={t.id} />
                            <input
                              type="hidden"
                              name="propertyId"
                              value={p.id}
                            />
                            <Input
                              name="fechaPago"
                              type="date"
                              required
                              className="h-7 w-36 text-xs"
                            />
                            <Button
                              type="submit"
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs"
                            >
                              Marcar pagada
                            </Button>
                          </form>
                        )}
                        <form action={removeTax}>
                          <input type="hidden" name="taxId" value={t.id} />
                          <input
                            type="hidden"
                            name="propertyId"
                            value={p.id}
                          />
                          <button
                            type="submit"
                            aria-label="Quitar contribución"
                            className="text-muted-foreground transition-colors hover:text-destructive"
                          >
                            <X className="size-4" />
                          </button>
                        </form>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <CardFooter className="border-t">
              <AddTaxForm propertyId={p.id} />
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="alertas" className="mt-6">
          <ComingSoon fase="Fase 5">
            Aquí aparecen las alertas de autocontrol específicas de esta
            propiedad.
          </ComingSoon>
        </TabsContent>
      </Tabs>
    </>
  );
}
