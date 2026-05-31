// Etiquetas en español y opciones para los enums del dominio.
// Centralizado para que selects y vistas muestren texto consistente.
import {
  PropertyType,
  PropertyStatus,
  PropertyGoal,
  Currency,
  OwnerType,
  ContractStatus,
  AdjustmentType,
} from "@/generated/prisma/enums";

export const propertyTypeLabels: Record<PropertyType, string> = {
  DEPARTAMENTO: "Departamento",
  CASA: "Casa",
  OFICINA: "Oficina",
  LOCAL: "Local comercial",
  BODEGA: "Bodega",
  ESTACIONAMIENTO: "Estacionamiento",
  TERRENO: "Terreno",
  PARCELA: "Parcela",
  AGRICOLA: "Agrícola",
};

export const propertyStatusLabels: Record<PropertyStatus, string> = {
  ARRENDADA: "Arrendada",
  DISPONIBLE: "Disponible",
  EN_VENTA: "En venta",
  USO_PROPIO: "Uso propio",
  DESOCUPADA: "Desocupada",
};

export const propertyGoalLabels: Record<PropertyGoal, string> = {
  INVERSION: "Inversión",
  USO_PROPIO: "Uso propio",
  VENTA: "Venta",
};

export const currencyLabels: Record<Currency, string> = {
  CLP: "Pesos (CLP)",
  UF: "UF",
};

export const ownerTypeLabels: Record<OwnerType, string> = {
  PERSONA: "Persona",
  SOCIEDAD: "Sociedad",
};

export const contractStatusLabels: Record<ContractStatus, string> = {
  VIGENTE: "Vigente",
  POR_VENCER: "Por vencer",
  VENCIDO: "Vencido",
  RENOVADO: "Renovado",
  TERMINADO: "Terminado",
};

export const adjustmentTypeLabels: Record<AdjustmentType, string> = {
  NINGUNO: "Sin reajuste",
  IPC: "IPC",
  UF: "UF",
};

// Convierte un mapa de etiquetas en opciones { value, label } para un <Select>.
export function enumOptions<T extends Record<string, string>>(
  labels: T,
): { value: string; label: string }[] {
  return Object.entries(labels).map(([value, label]) => ({ value, label }));
}

// Variante de color del badge según el estado de la propiedad.
export function propertyStatusVariant(
  estado: PropertyStatus,
): "default" | "secondary" | "outline" {
  switch (estado) {
    case "ARRENDADA":
      return "default";
    case "EN_VENTA":
      return "secondary";
    default:
      return "outline";
  }
}

// Variante de color del badge según el estado del contrato.
export function contractStatusVariant(
  estado: ContractStatus,
): "default" | "secondary" | "outline" | "destructive" {
  switch (estado) {
    case "VIGENTE":
      return "default";
    case "POR_VENCER":
      return "secondary";
    case "VENCIDO":
      return "destructive";
    default:
      return "outline";
  }
}
