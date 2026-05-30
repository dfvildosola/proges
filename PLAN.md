# PROGES — Plan de construcción

> El "cómo": fases concretas + modelo de datos en detalle.
> Para el "por qué" y las decisiones de fondo, ver `BRIEF.md`.
> Última actualización: 2026-05-30.

---

## 1. Resumen

Software de gestión de patrimonio inmobiliario (Chile). Se construye **single-tenant**
(un patrimonio) con `organizationId` en todo el modelo para abrir multi-tenant después
sin reescribir. El núcleo es **cobranza + autocontrol/alertas**; lo demás es la base que
los alimenta. Orden:

```
Propiedades  →  Contratos + arrendatarios  →  Cobros y su estado  →  Alertas
```

Stack: **Next.js 16 (App Router) + TypeScript · Tailwind + shadcn/ui · Prisma + Neon/Postgres
· Clerk · Vercel**. Diferido: Vercel Blob (documentos), Resend (emails), AI SDK (buscador).

---

## 2. Modelo de datos

Principios:
- **Toda** tabla de negocio lleva `organizationId` (aislamiento futuro; hoy valor fijo).
- Esquema relacional normalizado, sin capas bronze/silver/gold (eso es de analítica, no de
  una app transaccional — ver `BRIEF.md`).
- **Archivos nunca en la DB:** el binario va a Vercel Blob; la tabla guarda metadatos +
  puntero (`blobKey`). Campos para texto/embeddings quedan reservados pero vacíos (post-MVP).
- Multimoneda: cada monto guarda su `moneda` (CLP/UF); la conversión se hace en lectura con
  `CurrencyValue`. Montos en enteros (CLP sin decimales; UF con 2 → guardar en "centésimas").

### Enums
```
PropertyType    DEPARTAMENTO · CASA · OFICINA · LOCAL · BODEGA · ESTACIONAMIENTO
                · TERRENO · PARCELA · AGRICOLA
PropertyStatus  ARRENDADA · DISPONIBLE · EN_VENTA · USO_PROPIO · DESOCUPADA
PropertyGoal    INVERSION · USO_PROPIO · VENTA
Currency        CLP · UF
OwnerType       PERSONA · SOCIEDAD
ContractStatus  VIGENTE · POR_VENCER · VENCIDO · RENOVADO · TERMINADO
AdjustmentType  NINGUNO · IPC · UF
ChargeStatus    PENDIENTE · PAGADO · ATRASADO
MovementType    INGRESO · GASTO
MovementCat     ARRIENDO · REPARACION · GASTO_COMUN · SEGURO · IMPUESTO · OTRO
TaxStatus       PENDIENTE · PAGADA
DocumentType    ESCRITURA · DOMINIO_VIGENTE · INSCRIPCION_CBR · HIPOTECA · NO_EXPROPIACION
                · SEGURO · CONTRATO · PRESUPUESTO · FOTO · OTRO
AlertType       ARRENDADA_SIN_CONTRATO · CONTRATO_POR_VENCER · ARRIENDO_ATRASADO
                · CONTRIBUCION_IMPAGA · DESOCUPADA_PROLONGADA
AlertSeverity   INFO · MEDIA · ALTA
AlertStatus     ACTIVA · RESUELTA
RateType        UF · IPC
```

### Entidades (núcleo)

**Property** — la propiedad. Centro del modelo; casi todo cuelga de acá.
`id · organizationId · rolSII · tipo(PropertyType) · direccion · comuna · region
· objetivo(PropertyGoal) · estado(PropertyStatus) · monedaPrincipal(Currency)
· avaluoFiscal? · valorComercial? · createdAt · updatedAt`
Relaciones: tags (N:N), owners (vía PropertyOwner), documents, contracts, movements,
taxes, alerts.

**PropertyTag** — etiquetas libres por cliente (ej: "riesgo alto", "herencia").
`id · organizationId · nombre` — N:N con Property (tabla `_PropertyTags`).

**Owner** — propietario (persona o sociedad). `id · organizationId · nombre · rut · tipo(OwnerType)`.

**PropertyOwner** — puente de copropiedad. `propertyId · ownerId · porcentaje` (suma ≤ 100).

**Tenant** — arrendatario (solo datos, sin portal). `id · organizationId · nombre · rut · email? · telefono?`.

**LeaseContract** — contrato de arriendo.
`id · organizationId · propertyId · tenantId · monto · moneda(Currency)
· aplicaReajuste(bool) · reajusteTipo(AdjustmentType) · reajusteFrecuenciaMeses?
· fechaInicio · fechaTermino · diaPago(1-31) · estado(ContractStatus)
· createdAt · updatedAt`
*(post-MVP: garantía, multas, renovación automática)*

**RentCharge** — cobro de arriendo por período. El corazón de la cobranza.
`id · organizationId · contractId · periodo(YYYY-MM) · montoEsperado · moneda
· fechaVencimiento · estado(ChargeStatus) · fechaPago? · montoPagado?
· interesMora?(manual en MVP) · notas?`
Único por (contractId, periodo).

**Movement** — ingreso o gasto de una propiedad.
`id · organizationId · propertyId · tipo(MovementType) · categoria(MovementCat)
· monto · moneda · fecha · descripcion? · documentId? · rentChargeId?(si es el ingreso del arriendo)`

**PropertyTax** — contribución (manual en MVP).
`id · organizationId · propertyId · anio · cuota(1-4) · monto · fechaVencimiento
· estado(TaxStatus) · fechaPago?`

**Document** — metadatos + puntero al archivo (binario en Vercel Blob).
`id · organizationId · propertyId · tipo(DocumentType) · nombre · blobKey
· fechaEmision? · fechaVencimiento?(alimenta alertas)
· fojas? · numero? · anio?  (campos Conservador)
· extractedText?(silver, post-MVP) · embedding?(gold/pgvector, post-MVP)
· createdAt`

**Alert** — generada por el motor de reglas.
`id · organizationId · tipo(AlertType) · severidad(AlertSeverity) · mensaje
· propertyId? · contractId? · estado(AlertStatus) · createdAt · resolvedAt?`

**CurrencyValue** — valores UF/IPC para convertir en informes. `id · fecha · tipo(RateType) · valor`
*(global, sin organizationId; ingreso manual en MVP)*

---

## 3. Fases de construcción

Secuenciales, pero cada una deja algo demostrable. Una persona + Claude.

### ✅ Fase 0 — Scaffold *(hecho)*
Next.js 16 + Tailwind/shadcn + Clerk + Prisma. App corriendo con login.

### Fase 1 — Fundaciones
- Conectar **Neon/Postgres** (Vercel Marketplace) y `DATABASE_URL`.
- Escribir el **schema completo del núcleo** (sección 2) + primera migración.
- **Login Clerk single-tenant**: un usuario entra; `organizationId` se resuelve a un valor
  fijo (helper central `getOrgId()` que toda consulta usa — ya con la forma del futuro multi-tenant).
- **Shell de navegación**: barra lateral (grupos *Trabajo diario* / *Cartera*), responsive
  (hamburguesa en móvil), tema neutro de shadcn. Páginas vacías por sección.
- **Entregable:** app con login y navegación completa, DB migrada, lista para cargar datos.

### Fase 2 — Propiedades
- CRUD de propiedades (alta/edición/listado, tabla buscable).
- Dueños (`Owner`) y **copropiedad** con % (`PropertyOwner`).
- Etiquetas libres (`PropertyTag`).
- **Ficha de propiedad** con pestañas (esqueleto): Resumen · Documentos · Contrato ·
  Económico · Contribuciones · Alertas (las pestañas se llenan en fases siguientes).
- **Entregable:** puedo cargar la cartera completa del patrimonio.

### Fase 3 — Contratos y contactos
- **Contactos**: arrendatarios (`Tenant`) — alta y listado.
- **Contratos** (`LeaseContract`): crear/editar, UF o CLP, datos de reajuste, fechas,
  `diaPago`, estado; vincular a propiedad y arrendatario.
- Pestaña **Contrato** de la ficha + vista transversal **Contratos** (vigentes, por vencer).
- **Entregable:** puedo registrar todos los arriendos de la cartera.

### Fase 4 — Cobranza y control económico
- **Cobros** (`RentCharge`): generar el período del mes por contrato, marcar pagado/atrasado,
  registrar `fechaPago`/`montoPagado` e `interesMora` manual.
- **Movimientos** (`Movement`): ingresos/gastos por propiedad (pestaña Económico).
- **Contribuciones** (`PropertyTax`): registro manual (pestaña Contribuciones).
- Vista transversal **Cobranza**: la tabla del mes (quién pagó, quién no, cuánto).
- `CurrencyValue` + helper de conversión CLP↔UF para totales.
- **Entregable:** veo la situación financiera por propiedad y el estado de cobranza del mes.

### Fase 5 — Alertas (autocontrol) + Dashboard
- **Motor de reglas** que genera/actualiza `Alert`. Reglas del MVP:
  1. Propiedad `ARRENDADA` sin contrato `VIGENTE` cargado.
  2. Contrato por vencer (ej: ≤ 60 días).
  3. Arriendo atrasado (`RentCharge` pendiente y vencido).
  4. Contribución por pagar / vencida.
  5. Propiedad `DESOCUPADA` hace > X meses.
- Vista **Pendientes** (inbox de alertas, con contador en el menú) + alertas en la ficha.
- **Inicio** (dashboard): KPIs (n° propiedades, % arrendadas, ingreso del mes, alertas
  activas) + lista de alertas.
- *(Email de alertas vía Resend: opcional al final de esta fase o difiérelo.)*
- **Entregable:** el sistema avisa inconsistencias y vencimientos. El diferenciador, vivo.

### Fase 6 — Piloto
- Cargar datos reales del candidato, pulir UX, ajustar reglas con feedback real.
- **Entregable:** MVP usable por un cliente real.

---

## 4. Navegación / UX (referencia)

- **Principio:** "Excel ordenado", no software empresarial.
- **Barra lateral** (colapsa en móvil):
  - *Trabajo diario:* **Inicio · Pendientes · Cobranza**
  - *Cartera:* **Propiedades · Contratos · Contactos**
- **Ficha de propiedad** = el caballo de batalla, con pestañas.
- **Regla de escalamiento:** pertenece a *una* propiedad → pestaña en la ficha;
  cruza *toda* la cartera → ítem de menú. El menú se queda en ~6 ítems.
- Responsive: tablas → tarjetas apiladas en móvil.

---

## 5. Decisiones y supuestos

- **Single-tenant con `organizationId` listo**: helper `getOrgId()` central; toda consulta
  filtra por él. Multi-tenant (orgs/roles/switching) es aditivo, post-piloto.
- **Multimoneda**: monto + `moneda` por registro; conversión en lectura con `CurrencyValue`.
- **Mora**: monto de interés ingresado a mano en MVP; el sistema lo registra y muestra.
- **Documentos**: binario en Vercel Blob privado; DB guarda metadatos + `blobKey`.
  El ciclo crudo→texto→embeddings (silver/gold) es post-MVP; los campos quedan reservados.
- **Sin pasarela de pago**: cuentas se activan manualmente.
- **Diseñar para el futuro sin construirlo**: agrupación de propiedades (edificios),
  subdivisión de un ROL en unidades, integraciones SII/Conservador. El modelo no se cierra a esto.

---

## 6. Diferido (post-MVP / v2+)

Documental (subida real de archivos) · informes PDF/Excel · buscador con IA (AI SDK +
tool calling) · RAG/OCR sobre documentos (`pgvector`) · multi-tenant completo (orgs, 4 roles,
switching) · cálculo automático de mora · garantías/multas/renovación · envío automático de
solicitudes de pago (email/WhatsApp) · boleta/factura SII · conciliación bancaria ·
integraciones SII/Conservador/Tesorería/Banco Central · pasarela de pago + auto-registro ·
portal de arrendatarios · módulo de mantención/presupuestos completo.

---

## 7. Próximo paso

**Fase 1 — Fundaciones:** conectar Neon, escribir el schema completo del núcleo + migración,
login single-tenant con `getOrgId()`, y el shell de navegación. De ahí, correr `/init` para
generar el `CLAUDE.md` del proyecto.
