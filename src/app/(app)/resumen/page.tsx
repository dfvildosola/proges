import Link from "next/link";
import {
  TrendingUp,
  Landmark,
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  Scale,
  AlertTriangle,
  Receipt,
  Home as HomeIcon,
} from "lucide-react";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/org";
import { getLatestUf, toCLP } from "@/lib/currency";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney } from "@/lib/format";
import {
  propertyTypeLabels,
  propertyGoalLabels,
  propertyStatusLabels,
  movementCategoryLabels,
} from "@/lib/domain";
import { OwnerFilter } from "./owner-filter";

function formatPct(n: number, digits = 1): string {
  return `${new Intl.NumberFormat("es-CL", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n)}%`;
}

export default async function ResumenPage({
  searchParams,
}: PageProps<"/resumen">) {
  const sp = await searchParams;
  const ownerId = typeof sp.owner === "string" ? sp.owner : null;

  const orgId = await getOrgId();
  const now = new Date();
  const year = now.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const yearEnd = new Date(Date.UTC(year, 11, 31, 23, 59, 59));

  const [uf, owners, properties, movements, charges] = await Promise.all([
    getLatestUf(),
    db.owner.findMany({
      where: { organizationId: orgId },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true },
    }),
    db.property.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        rolSII: true,
        tipo: true,
        direccion: true,
        comuna: true,
        objetivo: true,
        estado: true,
        valorComercial: true,
        valorComercialMoneda: true,
        owners: { select: { ownerId: true, porcentaje: true } },
        contracts: {
          where: { estado: "VIGENTE" },
          select: { monto: true, moneda: true },
        },
        assessments: {
          orderBy: { anio: "desc" },
          take: 1,
          select: { valor: true },
        },
        taxes: { where: { estado: "PENDIENTE" }, select: { monto: true } },
      },
    }),
    db.movement.findMany({
      where: {
        organizationId: orgId,
        fecha: { gte: yearStart, lte: yearEnd },
      },
      select: {
        propertyId: true,
        tipo: true,
        categoria: true,
        monto: true,
        moneda: true,
      },
    }),
    db.rentCharge.findMany({
      where: { organizationId: orgId },
      select: {
        estado: true,
        montoEsperado: true,
        moneda: true,
        contract: { select: { propertyId: true } },
      },
    }),
  ]);

  const selectedOwner = ownerId
    ? owners.find((o) => o.id === ownerId) ?? null
    : null;

  // Fracción de propiedad del dueño seleccionado sobre una propiedad.
  // Sin filtro: 1 (cartera completa). Con filtro: % del dueño, o null si no participa.
  function shareOf(prop: (typeof properties)[number]): number | null {
    if (!ownerId) return 1;
    const po = prop.owners.find((o) => o.ownerId === ownerId);
    return po ? Number(po.porcentaje) / 100 : null;
  }

  // --- Acumuladores -----------------------------------------------------------
  let patrimonioCLP = 0;
  let avaluoCLP = 0;
  let comercialComparable = 0; // solo propiedades con comercial Y avalúo
  let avaluoComparable = 0;
  let annualRentTotal = 0;
  let propsCount = 0;
  let desocupadas = 0;
  let arrendadaSinContrato = 0;
  let taxPendienteMonto = 0;
  let taxPendienteCount = 0;

  const porTipo = new Map<string, number>();
  const porComuna = new Map<string, number>();
  const fracById = new Map<string, number>();
  const rentaRows: {
    id: string;
    rol: string;
    direccion: string;
    tipo: string;
    objetivo: string;
    estado: string;
    valorCLP: number;
    annualCLP: number;
    capRate: number | null;
  }[] = [];

  for (const p of properties) {
    const frac = shareOf(p);
    if (frac === null) continue;
    fracById.set(p.id, frac);
    propsCount++;

    const comercial = toCLP(p.valorComercial, p.valorComercialMoneda, uf);
    if (comercial !== null) {
      const v = comercial * frac;
      patrimonioCLP += v;
      porTipo.set(p.tipo, (porTipo.get(p.tipo) ?? 0) + v);
      porComuna.set(p.comuna, (porComuna.get(p.comuna) ?? 0) + v);
    }

    const avaluo = p.assessments[0] ? Number(p.assessments[0].valor) : null;
    if (avaluo !== null) avaluoCLP += avaluo * frac;
    if (comercial !== null && avaluo !== null) {
      comercialComparable += comercial * frac;
      avaluoComparable += avaluo * frac;
    }

    let annual = 0;
    for (const c of p.contracts) {
      const m = toCLP(c.monto, c.moneda, uf);
      if (m !== null) annual += m * 12;
    }
    const hasContract = p.contracts.length > 0;
    annualRentTotal += annual * frac;

    if (comercial !== null) {
      rentaRows.push({
        id: p.id,
        rol: p.rolSII,
        direccion: p.direccion,
        tipo: propertyTypeLabels[p.tipo],
        objetivo: propertyGoalLabels[p.objetivo],
        estado: propertyStatusLabels[p.estado],
        valorCLP: comercial * frac,
        annualCLP: annual * frac,
        capRate: comercial > 0 && hasContract ? (annual / comercial) * 100 : null,
      });
    }

    if (p.estado === "DESOCUPADA") desocupadas++;
    if (p.estado === "ARRENDADA" && !hasContract) arrendadaSinContrato++;

    for (const t of p.taxes) {
      taxPendienteCount++;
      if (t.monto !== null) taxPendienteMonto += Number(t.monto) * frac;
    }
  }

  // Flujo del año
  let ingresos = 0;
  let gastos = 0;
  const gastoPorCat = new Map<string, number>();
  for (const m of movements) {
    const frac = fracById.get(m.propertyId);
    if (frac === undefined) continue;
    const clp = toCLP(m.monto, m.moneda, uf);
    if (clp === null) continue;
    const v = clp * frac;
    if (m.tipo === "INGRESO") ingresos += v;
    else {
      gastos += v;
      gastoPorCat.set(m.categoria, (gastoPorCat.get(m.categoria) ?? 0) + v);
    }
  }
  const neto = ingresos - gastos;

  // Cobranza
  let atrasadoMonto = 0;
  let atrasadoCount = 0;
  for (const ch of charges) {
    const frac = fracById.get(ch.contract.propertyId);
    if (frac === undefined) continue;
    if (ch.estado !== "ATRASADO") continue;
    atrasadoCount++;
    const clp = toCLP(ch.montoEsperado, ch.moneda, uf);
    if (clp !== null) atrasadoMonto += clp * frac;
  }

  const plusvaliaPct =
    avaluoComparable > 0
      ? (comercialComparable / avaluoComparable - 1) * 100
      : null;
  const patrimonioUF = uf ? patrimonioCLP / uf : null;
  const yieldBruto =
    patrimonioCLP > 0 ? (annualRentTotal / patrimonioCLP) * 100 : null;

  rentaRows.sort((a, b) => (b.capRate ?? -1) - (a.capRate ?? -1));

  const tiposOrdenados = [...porTipo.entries()].sort((a, b) => b[1] - a[1]);
  const comunasOrdenadas = [...porComuna.entries()].sort((a, b) => b[1] - a[1]);
  const gastosOrdenados = [...gastoPorCat.entries()].sort((a, b) => b[1] - a[1]);

  const ufNota = uf
    ? `Montos en UF convertidos a 1 UF = ${formatMoney(uf, "CLP")}.`
    : "Sin valor UF cargado: los montos en UF no se incluyen en los totales.";

  return (
    <>
      <PageHeader
        title="Resumen"
        description={
          selectedOwner
            ? `Patrimonio y resultados de ${selectedOwner.nombre} (ponderado por su % de propiedad).`
            : "Patrimonio, flujo y rentabilidad de toda la cartera."
        }
        action={<OwnerFilter owners={owners} value={ownerId} />}
      />

      {propsCount === 0 ? (
        <p className="text-sm text-muted-foreground">
          {ownerId
            ? "Este dueño no tiene propiedades asociadas."
            : "Aún no hay propiedades registradas."}
        </p>
      ) : (
        <div className="space-y-10">
          {/* ---------------- Patrimonio ---------------- */}
          <section>
            <SectionTitle>Patrimonio</SectionTitle>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Metric
                label="Valor comercial"
                value={formatMoney(patrimonioCLP, "CLP")}
                sub={
                  patrimonioUF !== null
                    ? `≈ ${formatMoney(patrimonioUF, "UF")}`
                    : undefined
                }
                icon={Landmark}
              />
              <Metric
                label="Avalúo fiscal"
                value={formatMoney(avaluoCLP, "CLP")}
                sub="base de contribuciones"
                icon={Scale}
              />
              <Metric
                label="Plusvalía s/ fiscal"
                value={plusvaliaPct !== null ? formatPct(plusvaliaPct) : "—"}
                sub={
                  plusvaliaPct !== null
                    ? "comercial vs avalúo"
                    : "falta comercial o avalúo"
                }
                icon={TrendingUp}
              />
              <Metric
                label="Propiedades"
                value={String(propsCount)}
                sub={selectedOwner ? "con participación" : "en cartera"}
                icon={HomeIcon}
              />
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <Breakdown
                title="Por tipo"
                items={tiposOrdenados.map(([k, v]) => ({
                  label: propertyTypeLabels[k as keyof typeof propertyTypeLabels],
                  value: v,
                }))}
                total={patrimonioCLP}
              />
              <Breakdown
                title="Por comuna"
                items={comunasOrdenadas.map(([k, v]) => ({ label: k, value: v }))}
                total={patrimonioCLP}
              />
            </div>
          </section>

          {/* ---------------- Flujo del año ---------------- */}
          <section>
            <SectionTitle>Flujo {year}</SectionTitle>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Metric
                label="Ingresos"
                value={formatMoney(ingresos, "CLP")}
                icon={ArrowUpRight}
              />
              <Metric
                label="Gastos"
                value={formatMoney(gastos, "CLP")}
                icon={ArrowDownRight}
              />
              <Metric
                label="Resultado neto"
                value={formatMoney(neto, "CLP")}
                sub={
                  ingresos > 0
                    ? `margen ${formatPct((neto / ingresos) * 100, 0)}`
                    : undefined
                }
                icon={Wallet}
                emphasis={neto < 0 ? "negative" : "positive"}
              />
            </div>

            <div className="mt-4">
              <Breakdown
                title="Gastos por categoría"
                items={gastosOrdenados.map(([k, v]) => ({
                  label:
                    movementCategoryLabels[
                      k as keyof typeof movementCategoryLabels
                    ],
                  value: v,
                }))}
                total={gastos}
                emptyText="Sin gastos registrados este año."
              />
            </div>
          </section>

          {/* ---------------- Rentabilidad ---------------- */}
          <section>
            <div className="mb-3 flex items-baseline justify-between gap-4">
              <SectionTitle className="mb-0">Rentabilidad</SectionTitle>
              {yieldBruto !== null && (
                <span className="text-sm text-muted-foreground">
                  Yield bruto cartera:{" "}
                  <span className="font-semibold text-foreground tabular-nums">
                    {formatPct(yieldBruto)}
                  </span>
                </span>
              )}
            </div>
            <p className="mb-3 text-sm text-muted-foreground">
              Cap rate = arriendo anual ÷ valor comercial. Ordenado de mayor a
              menor: lo de abajo rinde poco para lo que vale.
            </p>
            <div className="overflow-hidden rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Propiedad</TableHead>
                    <TableHead>Objetivo</TableHead>
                    <TableHead className="text-right">Valor comercial</TableHead>
                    <TableHead className="text-right">Arriendo anual</TableHead>
                    <TableHead className="text-right">Cap rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rentaRows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <Link
                          href={`/propiedades/${r.id}`}
                          className="font-medium underline-offset-2 hover:underline"
                        >
                          {r.rol}
                        </Link>
                        <div className="text-xs text-muted-foreground">
                          {r.tipo} · {r.direccion}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {r.objetivo}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMoney(r.valorCLP, "CLP")}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {r.annualCLP > 0 ? (
                          formatMoney(r.annualCLP, "CLP")
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {r.capRate !== null ? (
                          <span className="font-medium">
                            {formatPct(r.capRate)}
                          </span>
                        ) : (
                          <Badge variant="secondary">Sin contrato</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>

          {/* ---------------- Salud / cobranza ---------------- */}
          <section>
            <SectionTitle>Salud de la cartera</SectionTitle>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Metric
                label="Arriendos atrasados"
                value={formatMoney(atrasadoMonto, "CLP")}
                sub={`${atrasadoCount} ${atrasadoCount === 1 ? "cobro" : "cobros"}`}
                icon={AlertTriangle}
                emphasis={atrasadoCount > 0 ? "negative" : undefined}
                href="/cobranza"
              />
              <Metric
                label="Contribuciones por pagar"
                value={formatMoney(taxPendienteMonto, "CLP")}
                sub={`${taxPendienteCount} ${taxPendienteCount === 1 ? "cuota" : "cuotas"}`}
                icon={Receipt}
                emphasis={taxPendienteCount > 0 ? "negative" : undefined}
              />
              <Metric
                label="Desocupadas"
                value={String(desocupadas)}
                sub="sin uso"
                icon={HomeIcon}
                emphasis={desocupadas > 0 ? "negative" : undefined}
              />
              <Metric
                label="Arrendadas sin contrato"
                value={String(arrendadaSinContrato)}
                sub="riesgo legal"
                icon={AlertTriangle}
                emphasis={arrendadaSinContrato > 0 ? "negative" : undefined}
              />
            </div>
          </section>

          <p className="text-xs text-muted-foreground">{ufNota}</p>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Presentación
// ---------------------------------------------------------------------------

function SectionTitle({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2 className={`mb-3 text-sm font-medium text-muted-foreground ${className}`}>
      {children}
    </h2>
  );
}

function Metric({
  label,
  value,
  sub,
  icon: Icon,
  emphasis,
  href,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  emphasis?: "positive" | "negative";
  href?: string;
}) {
  const card = (
    <Card className={href ? "transition-colors hover:bg-muted/50" : ""}>
      <CardHeader>
        <CardDescription className="flex items-center justify-between">
          {label}
          <Icon className="size-4" />
        </CardDescription>
        <CardTitle
          className={`text-2xl font-semibold tabular-nums ${
            emphasis === "negative"
              ? "text-destructive"
              : emphasis === "positive"
                ? "text-emerald-600 dark:text-emerald-500"
                : ""
          }`}
        >
          {value}
        </CardTitle>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </CardHeader>
    </Card>
  );
  return href ? (
    <Link href={href} className="block">
      {card}
    </Link>
  ) : (
    card
  );
}

function Breakdown({
  title,
  items,
  total,
  emptyText = "Sin datos.",
}: {
  title: string;
  items: { label: string; value: number }[];
  total: number;
  emptyText?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          items.map((it) => {
            const pct = total > 0 ? (it.value / total) * 100 : 0;
            return (
              <div key={it.label} className="space-y-1">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="truncate">{it.label}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {formatMoney(it.value, "CLP")} · {formatPct(pct, 0)}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.max(pct, 2)}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
