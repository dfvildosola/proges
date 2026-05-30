import type { Currency } from "@/generated/prisma/enums";

// Formatea un monto (Prisma Decimal, número o string) en formato chileno.
// CLP sin decimales; UF con 2. Devuelve "—" si es nulo.
export function formatMoney(
  value: { toString(): string } | number | null | undefined,
  moneda?: Currency,
): string {
  if (value === null || value === undefined) return "—";
  const n = Number(value.toString());
  if (Number.isNaN(n)) return "—";
  const formatted = new Intl.NumberFormat("es-CL", {
    maximumFractionDigits: moneda === "UF" ? 2 : 0,
  }).format(n);
  return moneda ? `${formatted} ${moneda}` : formatted;
}

// Fecha corta en formato chileno (dd-mm-aaaa). "—" si es nula.
export function formatDate(value: Date | null | undefined): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-CL").format(value);
}
