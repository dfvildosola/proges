// Seed de datos de prueba para Proges.
// Genera ~50 propiedades con arrendatarios, contratos, cobros y contribuciones.
//
// Uso:
//   npm run db:seed                          ← DB local
//   DATABASE_URL="postgresql://..." npm run db:seed   ← Neon u otra DB

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const ORG = "org_proges";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const copy = [...arr].sort(() => Math.random() - 0.5);
  return copy.slice(0, n);
}

function rut(base: number): string {
  const digits = String(base);
  const reversed = digits.split("").reverse().map(Number);
  const series = [2, 3, 4, 5, 6, 7, 2, 3, 4, 5, 6, 7];
  const sum = reversed.reduce((acc, d, i) => acc + d * series[i], 0);
  const remainder = 11 - (sum % 11);
  const dv = remainder === 11 ? "0" : remainder === 10 ? "K" : String(remainder);
  const fmt = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${fmt}-${dv}`;
}

function rolSII(num: number): string {
  const block = String(Math.floor(num / 100)).padStart(4, "0");
  const unit = String(num % 100).padStart(3, "0");
  return `${block}-${unit}`;
}

function date(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m - 1, d));
}

function addMonths(dt: Date, n: number): Date {
  const d = new Date(dt);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d;
}

function periodoStr(dt: Date): string {
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Datos base
// ---------------------------------------------------------------------------

const COMUNAS: [string, string][] = [
  ["Las Condes", "Región Metropolitana"],
  ["Providencia", "Región Metropolitana"],
  ["Vitacura", "Región Metropolitana"],
  ["Ñuñoa", "Región Metropolitana"],
  ["La Reina", "Región Metropolitana"],
  ["San Miguel", "Región Metropolitana"],
  ["Macul", "Región Metropolitana"],
  ["La Florida", "Región Metropolitana"],
  ["Maipú", "Región Metropolitana"],
  ["Peñalolén", "Región Metropolitana"],
  ["Santiago", "Región Metropolitana"],
  ["Estación Central", "Región Metropolitana"],
];

const CALLES = [
  "Av. Apoquindo", "Av. Providencia", "Av. Las Condes", "Av. Vitacura",
  "Av. Irarrázaval", "Av. Tobalaba", "Av. Kennedy", "Av. Cristóbal Colón",
  "Av. Bilbao", "Av. Francisco Bilbao", "Calle Los Militares", "Calle Baquedano",
  "Av. Grecia", "Av. Vicuña Mackenna", "Av. Marathon", "Calle San Pascual",
  "Av. Departamental", "Pasaje Los Aromos", "Calle Lota", "Av. Príncipe de Gales",
];

const NOMBRES_PERSONA = [
  "Carlos Andrés Vidal Soto", "María Elena Fuentes Rojas", "Jorge Luis Pereira Núñez",
  "Patricia Alejandra Morales Lagos", "Roberto Antonio Herrera Cáceres",
  "Ana Cecilia Muñoz Bravo", "Francisco Javier Ortiz Pérez", "Claudia Andrea Ramos Torres",
  "Rodrigo Sebastián Espinoza Vera", "Daniela Paz Castro Montoya",
  "Andrés Felipe Gutiérrez Silva", "Marcela Soledad Vargas Díaz",
];

const NOMBRES_TENANT = [
  "Sofía Isabel Araya Ponce", "Ignacio Hernán Rojas Saavedra", "Valentina Nicole Flores Contreras",
  "Matías Esteban Soto Guerrero", "Camila Javiera Mendez Alcaíno", "Felipe Andrés Torres Leiva",
  "Natalia Cristina Vega Villalobos", "Sebastián Alberto Mora Poblete", "Catalina Andrea Ríos Acevedo",
  "Diego Ignacio Reyes Jara", "Carla Valentina Sepúlveda Muñoz", "Marco Antonio Alvarez Reyes",
  "Daniela Francisca Concha Salinas", "Pablo Rodrigo Fuentes Espinoza", "Javiera Alejandra Bravo Cáceres",
  "Gonzalo Enrique Molina Herrera", "Constanza Beatriz Ibarra Rojas", "Cristóbal Ernesto Saavedra Lagos",
  "Francisca Paz Núñez Vidal", "Tomás Andrés Carrasco Morales", "Isidora Renata Espinoza Fuentes",
  "Álvaro Nicolás Pinto Ramos", "Verónica Soledad Gutiérrez Torres", "Agustín Rafael Castro Ortiz",
  "Montserrat Elena Pereira Díaz", "Héctor Guillermo Vargas Vega", "Lorena Patricia Soto Contreras",
  "Emilio Rodrigo Flores Guerrero", "Pilar Fernanda Arenas Alcaíno", "Bruno Alejandro Muñoz Leiva",
  "Valentina Paz Rojas Villalobos", "Maximiliano José Herrera Poblete", "Marcela Andrea Reyes Acevedo",
  "Javier Ignacio Castro Jara", "Camila Sofía Mendez Salinas", "Nicolás Felipe Ramos Espinoza",
  "Fernanda Isabel Torres Cáceres", "Lucas Andrés Silva Morales", "María Jesús Contreras Lagos",
  "Renata Valentina Vidal Fuentes",
];

// RUTs base únicos para personas y tenants
const RUTS_PERSONA  = [12345678, 15678234, 18234567, 11567890, 9876543, 10234567, 13456789, 16789012, 14321098, 17654321, 8901234, 19012345];
const RUTS_TENANT   = [
  20123456, 21234567, 22345678, 23456789, 24567890, 25678901, 26789012, 27890123,
  28901234, 7654321,  8123456,  9234567,  10345678, 11456789, 12567890, 13678901,
  14789012, 15890123, 16901234, 17012345, 18123456, 19234567, 20345678, 21456789,
  22567890, 23678901, 24789012, 25890123, 26901234, 27012345, 28123456, 7890123,
  8901235,  9012346,  10123457, 11234568, 12345679, 13456780, 14567891, 15678902,
];

// Plantillas de propiedades (tipo, piso/depto info, moneda preferida, rango monto)
type PropTemplate = {
  tipo: "DEPARTAMENTO" | "CASA" | "OFICINA" | "LOCAL" | "BODEGA";
  sufijo: string;
  moneda: "CLP" | "UF";
  montoMin: number;
  montoMax: number;
  m2Min: number;
  m2Max: number;
};

const TEMPLATES: PropTemplate[] = [
  { tipo: "DEPARTAMENTO", sufijo: "Depto",   moneda: "UF",  montoMin: 14, montoMax: 32, m2Min: 45, m2Max: 110 },
  { tipo: "DEPARTAMENTO", sufijo: "Depto",   moneda: "CLP", montoMin: 450000, montoMax: 900000, m2Min: 40, m2Max: 95 },
  { tipo: "CASA",         sufijo: "Casa",    moneda: "CLP", montoMin: 600000, montoMax: 1400000, m2Min: 80, m2Max: 220 },
  { tipo: "OFICINA",      sufijo: "Of",      moneda: "UF",  montoMin: 20, montoMax: 55, m2Min: 30, m2Max: 150 },
  { tipo: "LOCAL",        sufijo: "Local",   moneda: "UF",  montoMin: 18, montoMax: 45, m2Min: 25, m2Max: 120 },
  { tipo: "BODEGA",       sufijo: "Bodega",  moneda: "CLP", montoMin: 80000, montoMax: 250000, m2Min: 15, m2Max: 60 },
];

// Distribución de estados: 38 arrendadas, 7 disponibles, 3 desocupadas, 1 en venta, 1 uso propio
const ESTADOS_DIST: Array<"ARRENDADA" | "DISPONIBLE" | "DESOCUPADA" | "EN_VENTA" | "USO_PROPIO"> = [
  ...Array(38).fill("ARRENDADA"),
  ...Array(7).fill("DISPONIBLE"),
  ...Array(3).fill("DESOCUPADA"),
  ...Array(1).fill("EN_VENTA"),
  ...Array(1).fill("USO_PROPIO"),
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("🌱  Limpiando datos previos...");
  await db.alert.deleteMany({ where: { organizationId: ORG } });
  await db.propertyTax.deleteMany({ where: { organizationId: ORG } });
  await db.movement.deleteMany({ where: { organizationId: ORG } });
  await db.rentCharge.deleteMany({ where: { organizationId: ORG } });
  await db.leaseContract.deleteMany({ where: { organizationId: ORG } });
  await db.tenant.deleteMany({ where: { organizationId: ORG } });
  await db.propertyAssessment.deleteMany({ where: { organizationId: ORG } });
  await db.propertyUnit.deleteMany({ where: { organizationId: ORG } });
  await db.propertyOwner.deleteMany({ where: { organizationId: ORG } });
  await db.property.deleteMany({ where: { organizationId: ORG } });
  await db.owner.deleteMany({ where: { organizationId: ORG } });
  await db.propertyTag.deleteMany({ where: { organizationId: ORG } });
  await db.currencyValue.deleteMany();

  // -------------------------------------------------------------------------
  // Tags
  // -------------------------------------------------------------------------
  console.log("🏷️   Creando tags...");
  const tags = await Promise.all(
    ["premium", "riesgo alto", "herencia", "hipotecada", "remodelada"].map((nombre) =>
      db.propertyTag.create({ data: { organizationId: ORG, nombre } })
    )
  );

  // -------------------------------------------------------------------------
  // Owners
  // -------------------------------------------------------------------------
  console.log("👤  Creando propietarios...");
  const owners = await Promise.all([
    ...NOMBRES_PERSONA.slice(0, 8).map((nombre, i) =>
      db.owner.create({
        data: { organizationId: ORG, nombre, rut: rut(RUTS_PERSONA[i]), tipo: "PERSONA" },
      })
    ),
    db.owner.create({
      data: { organizationId: ORG, nombre: "Inversiones Vildósola SpA", rut: rut(76543210), tipo: "SOCIEDAD" },
    }),
    db.owner.create({
      data: { organizationId: ORG, nombre: "Inmobiliaria VF Ltda.", rut: rut(76012345), tipo: "SOCIEDAD" },
    }),
  ]);

  // -------------------------------------------------------------------------
  // Tenants
  // -------------------------------------------------------------------------
  console.log("🏠  Creando arrendatarios...");
  const tenants = await Promise.all(
    NOMBRES_TENANT.map((nombre, i) =>
      db.tenant.create({
        data: {
          organizationId: ORG,
          nombre,
          rut: rut(RUTS_TENANT[i]),
          email: `${nombre.split(" ")[0].toLowerCase()}.${nombre.split(" ")[1].toLowerCase()}@ejemplo.cl`,
          telefono: `+569${String(50000000 + i * 1234567).slice(0, 8)}`,
        },
      })
    )
  );

  // -------------------------------------------------------------------------
  // Propiedades
  // -------------------------------------------------------------------------
  console.log("🏢  Creando 50 propiedades...");
  const estados = [...ESTADOS_DIST].sort(() => Math.random() - 0.5);
  const properties = [];

  for (let i = 0; i < 50; i++) {
    const tpl = pick(TEMPLATES);
    const [comuna, region] = pick(COMUNAS);
    const calle = pick(CALLES);
    const numero = 100 + Math.floor(Math.random() * 9900);
    const unidad = tpl.tipo === "DEPARTAMENTO" ? `, ${tpl.sufijo} ${Math.floor(Math.random() * 30) + 1}${pick(["A","B","C","D","E"])}` : "";
    const estado = estados[i];
    const objetivo = estado === "EN_VENTA" ? "VENTA" : estado === "USO_PROPIO" ? "USO_PROPIO" : "INVERSION";

    const prop = await db.property.create({
      data: {
        organizationId: ORG,
        rolSII: rolSII(3000 + i * 17),
        tipo: tpl.tipo,
        direccion: `${calle} ${numero}${unidad}`,
        comuna,
        region,
        objetivo,
        estado,
        monedaPrincipal: tpl.moneda,
        m2Construidos: +(tpl.m2Min + Math.random() * (tpl.m2Max - tpl.m2Min)).toFixed(2),
        m2Terreno: tpl.tipo === "CASA" ? +(100 + Math.random() * 300).toFixed(2) : null,
        anoConstruccion: 1980 + Math.floor(Math.random() * 45),
        valorComercial: tpl.moneda === "UF"
          ? +(3000 + Math.random() * 7000).toFixed(2)
          : +(80000000 + Math.random() * 200000000).toFixed(0),
        valorComercialMoneda: tpl.moneda,
        tags: i % 7 === 0 ? { connect: [{ id: pick(tags).id }] } : undefined,
      },
    });

    // Avalúo fiscal
    await db.propertyAssessment.create({
      data: {
        organizationId: ORG,
        propertyId: prop.id,
        anio: 2025,
        valor: tpl.moneda === "UF"
          ? +(1500 + Math.random() * 5000).toFixed(2)
          : +(40000000 + Math.random() * 120000000).toFixed(0),
      },
    });

    // Propietario(s)
    const mainOwner = owners[i % owners.length];
    await db.propertyOwner.create({
      data: { organizationId: ORG, propertyId: prop.id, ownerId: mainOwner.id, porcentaje: 100 },
    });

    properties.push({ prop, tpl, estado });
  }

  // -------------------------------------------------------------------------
  // Contratos y cobros (solo propiedades ARRENDADA)
  // -------------------------------------------------------------------------
  console.log("📄  Creando contratos y cobros...");
  const arrendadas = properties.filter((p) => p.estado === "ARRENDADA");
  const hoy = new Date(Date.UTC(2026, 5, 1)); // 2026-06-01

  for (let i = 0; i < arrendadas.length; i++) {
    const { prop, tpl } = arrendadas[i];
    const tenant = tenants[i % tenants.length];

    // Monto: UF con 2 decimales, CLP sin decimales
    const montoRaw =
      tpl.moneda === "UF"
        ? +(tpl.montoMin + Math.random() * (tpl.montoMax - tpl.montoMin)).toFixed(2)
        : Math.round(tpl.montoMin + Math.random() * (tpl.montoMax - tpl.montoMin));

    // Algunos contratos por vencer en los próximos 2 meses
    const esPorVencer = i < 4;
    const inicioMesesAtras = 18 + Math.floor(Math.random() * 18); // 1.5-3 años atrás
    const duracionMeses = esPorVencer ? inicioMesesAtras + 1 + Math.floor(Math.random() * 30) : inicioMesesAtras + 24 + Math.floor(Math.random() * 24);
    const fechaInicio = addMonths(hoy, -inicioMesesAtras);
    fechaInicio.setUTCDate(1);
    const fechaTermino = addMonths(fechaInicio, duracionMeses);
    fechaTermino.setUTCDate(0); // último día del mes

    const diasHastaTermino = (fechaTermino.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24);
    const estadoContrato: "VIGENTE" | "POR_VENCER" = diasHastaTermino <= 60 ? "POR_VENCER" : "VIGENTE";

    const reajuste = pick(["NINGUNO", "NINGUNO", "NINGUNO", "IPC", "UF"] as const);

    const contract = await db.leaseContract.create({
      data: {
        organizationId: ORG,
        propertyId: prop.id,
        tenantId: tenant.id,
        monto: montoRaw,
        moneda: tpl.moneda,
        aplicaReajuste: reajuste !== "NINGUNO",
        reajusteTipo: reajuste,
        reajusteFrecuenciaMeses: reajuste !== "NINGUNO" ? 12 : null,
        fechaInicio,
        fechaTermino,
        diaPago: pick([1, 5, 5, 10, 10, 15]),
        estado: estadoContrato,
      },
    });

    // Cobros: últimos 5 meses + mes actual
    for (let m = -5; m <= 0; m++) {
      const periodoDate = addMonths(hoy, m);
      const periodo = periodoStr(periodoDate);
      const vencimiento = new Date(Date.UTC(periodoDate.getUTCFullYear(), periodoDate.getUTCMonth(), contract.diaPago));

      const esActual = m === 0;
      const esMesAnterior = m === -1;

      let estado: "PAGADO" | "PENDIENTE" | "ATRASADO";
      let fechaPago: Date | null = null;
      let montoPagado: number | null = null;

      if (esActual) {
        // Mes actual: mayoría pendiente, algunos ya pagaron
        const yaPago = Math.random() < 0.3;
        estado = yaPago ? "PAGADO" : "PENDIENTE";
        if (yaPago) {
          fechaPago = new Date(Date.UTC(2026, 5, Math.floor(Math.random() * 5) + 1));
          montoPagado = montoRaw;
        }
      } else if (esMesAnterior) {
        // Mes anterior: la mayoría pagó, algunos atrasados
        const pagado = Math.random() < 0.85;
        const atrasado = !pagado && Math.random() < 0.7;
        estado = pagado ? "PAGADO" : atrasado ? "ATRASADO" : "PENDIENTE";
        if (pagado) {
          const diasDespues = Math.floor(Math.random() * 12);
          fechaPago = new Date(vencimiento.getTime() + diasDespues * 86400000);
          montoPagado = montoRaw;
        }
      } else {
        // Meses anteriores: casi todos pagados
        estado = Math.random() < 0.95 ? "PAGADO" : "ATRASADO";
        if (estado === "PAGADO") {
          const diasDespues = Math.floor(Math.random() * 10);
          fechaPago = new Date(vencimiento.getTime() + diasDespues * 86400000);
          montoPagado = montoRaw;
        }
      }

      await db.rentCharge.create({
        data: {
          organizationId: ORG,
          contractId: contract.id,
          periodo,
          montoEsperado: montoRaw,
          moneda: tpl.moneda,
          fechaVencimiento: vencimiento,
          estado,
          fechaPago,
          montoPagado,
          interesMora: estado === "ATRASADO" ? +(montoRaw * 0.03).toFixed(0) : null,
        },
      });
    }
  }

  // -------------------------------------------------------------------------
  // Contribuciones 2026 (todas las propiedades)
  // -------------------------------------------------------------------------
  console.log("🧾  Creando contribuciones 2026...");
  const CUOTAS = [
    { cuota: 1, mes: 4, dia: 30 },  // Abril — ya vencida
    { cuota: 2, mes: 6, dia: 30 },  // Junio — vence este mes
    { cuota: 3, mes: 9, dia: 30 },  // Septiembre
    { cuota: 4, mes: 12, dia: 15 }, // Diciembre
  ];

  for (const { prop } of properties) {
    const montoBase = 80000 + Math.floor(Math.random() * 320000);
    for (const { cuota, mes, dia } of CUOTAS) {
      const vencimiento = date(2026, mes, dia);
      const yaVencio = vencimiento < hoy;
      const estado: "PAGADA" | "PENDIENTE" = yaVencio && Math.random() < 0.9 ? "PAGADA" : "PENDIENTE";
      await db.propertyTax.create({
        data: {
          organizationId: ORG,
          propertyId: prop.id,
          anio: 2026,
          cuota,
          monto: montoBase / 4,
          fechaVencimiento: vencimiento,
          estado,
          fechaPago: estado === "PAGADA" ? new Date(vencimiento.getTime() - 5 * 86400000) : null,
        },
      });
    }
  }

  // -------------------------------------------------------------------------
  // Valor UF histórico (últimos 6 meses + hoy)
  // -------------------------------------------------------------------------
  console.log("💱  Cargando valores UF...");
  const UF_VALORES = [
    { mes: 1, valor: 37856.23 },
    { mes: 2, valor: 37923.45 },
    { mes: 3, valor: 37991.12 },
    { mes: 4, valor: 38045.67 },
    { mes: 5, valor: 38102.89 },
    { mes: 6, valor: 38145.34 },
  ];
  for (const { mes, valor } of UF_VALORES) {
    await db.currencyValue.upsert({
      where: { fecha_tipo: { fecha: date(2026, mes, 1), tipo: "UF" } },
      update: { valor },
      create: { fecha: date(2026, mes, 1), tipo: "UF", valor },
    });
  }

  // -------------------------------------------------------------------------
  // Resumen
  // -------------------------------------------------------------------------
  const counts = {
    propiedades: await db.property.count({ where: { organizationId: ORG } }),
    contratos: await db.leaseContract.count({ where: { organizationId: ORG } }),
    cobros: await db.rentCharge.count({ where: { organizationId: ORG } }),
    contribuciones: await db.propertyTax.count({ where: { organizationId: ORG } }),
  };

  console.log("\n✅  Seed completado:");
  console.log(`   Propiedades:    ${counts.propiedades}`);
  console.log(`   Contratos:      ${counts.contratos}`);
  console.log(`   Cobros:         ${counts.cobros}`);
  console.log(`   Contribuciones: ${counts.contribuciones}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
