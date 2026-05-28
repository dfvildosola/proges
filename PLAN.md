# PROGES — Plan del MVP

> Software de gestión de patrimonio inmobiliario (Chile).
> SaaS multi-cliente, cobro por propiedad. Documento de referencia para construir el MVP.
> Última actualización: 2026-05-28.

---

## 1. Resumen y objetivo

**Qué es:** Una web app donde personas con patrimonios inmobiliarios medianos/grandes (≈20 a 200 propiedades) y sus administradores gestionan en un solo lugar: las propiedades, sus documentos legales, los contratos de arriendo, el control económico (ingresos/gastos/rentabilidad) y reciben **alertas automáticas** de inconsistencias.

**Diferenciador:** la capa de **autocontrol y alertas** (ej: "propiedad arrendada sin contrato cargado", "contrato por vencer", "arriendo atrasado", "contribución impaga"). Eso es lo que separa a Proges de una planilla Excel.

**Objetivo del MVP:** que un cliente real pueda dejar de usar Excel y administrar su cartera completa con: gestión de propiedades, contratos de arriendo, control económico, informes y alertas. Lanzable en ~2-3 meses construyéndolo tú con apoyo de Claude.

**Modelo de negocio (no se construye en MVP):** cobro por tramos de cantidad de propiedades, mensual o anual (anual con descuento). Venta y activación de cuentas **manual** al inicio (sin pasarela de pago ni auto-registro).

---

## 2. Stack tecnológico recomendado

Pensado para una persona construyendo (con Claude) y que mañana pueda tomar un ingeniero sin reescribir todo. Todo se opera barato y escala bien.

| Capa | Tecnología | Por qué |
|------|-----------|---------|
| Framework | **Next.js (App Router) + TypeScript** | Frontend + backend en un solo proyecto. Mucha documentación y soporte de IA. |
| UI | **Tailwind CSS + shadcn/ui** | Componentes listos y prolijos. Tema azul (marca Proges). |
| Base de datos | **PostgreSQL** (Neon, vía Vercel Marketplace) + extensión **pgvector** | Relacional, ideal para este dominio (propiedades, contratos, pagos). `pgvector` guarda los "embeddings" para la búsqueda con IA dentro de la misma base de datos (ver §5). |
| ORM | **Prisma** | Define el modelo de datos en un solo archivo; genera tipos TypeScript. Fácil de leer. |
| Autenticación + multi-tenant | **Clerk** (Marketplace de Vercel) | Trae **Organizaciones** y **roles** de fábrica: cada cliente = una organización, y un usuario puede pertenecer a varias (modelo empresa de administración). Resuelve gratis lo más difícil del multi-tenant. |
| Archivos/documentos | **Vercel Blob (privado)** | Subir y guardar PDFs, fotos, contratos de forma segura. |
| Email (alertas) | **Resend** | Envío simple de correos de alerta. |
| PDF / Excel | **@react-pdf/renderer** + **SheetJS (xlsx)** | Generar informes en ambos formatos. |
| IA / Agentes | **Vercel AI SDK** + **Vercel AI Gateway** (modelos Claude) | Construir el asistente conversacional y el buscador inteligente con "tool calling" (ver §5). El Gateway permite cambiar de modelo y controlar costos con una sola API. |
| Hosting | **Vercel** | Deploy automático, previews, barato para empezar. |

> **Nota sobre multi-tenant:** cada tabla de datos lleva un `organizationId`. Toda consulta filtra por la organización activa del usuario. Esto aísla los datos de cada cliente. Clerk entrega ese `organizationId` y el rol del usuario.

---

## 3. Modelo de datos (MVP)

Entidades principales. Todas (salvo las globales) llevan `organizationId`.

### Usuarios y organización (gestionado por Clerk)
- **Organization** = un cliente / patrimonio.
- **User / Membership** con rol: `dueño`, `administrador`, `contador`, `comercial`.
  - *Dueño:* ve todo, no opera. *Administrador:* opera todo. *Contador:* ve/exporta lo financiero. *Comercial:* gestiona propiedades en venta.

### Propiedades
- **Property** (Propiedad)
  - `rolSII`, `tipo` (departamento, casa, oficina, local, bodega, estacionamiento, terreno, parcela, agrícola…), `direccion`, `comuna`, `region`
  - `objetivo` (inversión / uso propio / venta), `estado` (arrendada / disponible / en venta / uso propio / desocupada)
  - `monedaPrincipal` (CLP / UF), `avaluoFiscal`, `valorComercial`
  - relación a etiquetas, dueños, documentos, contratos, movimientos, contribuciones
- **PropertyTag / Categoria** — etiquetas libres definidas por cada cliente (ej: "riesgo alto", "largo plazo", "herencia"). Relación N:N con Property.
- **Owner** (Propietario: persona o sociedad) — `nombre`, `rut`, `tipo` (persona/sociedad).
- **PropertyOwner** — tabla puente para **copropiedad**: `propertyId`, `ownerId`, `porcentaje`. (Permite varios dueños por propiedad con % cada uno.)

### Documental
- **Document**
  - `propertyId`, `tipo`/clasificación (escritura, dominio vigente, inscripción Conservador, hipoteca/gravamen, no expropiación, seguro, contrato, presupuesto, foto, otro)
  - `archivoUrl` (Vercel Blob), `nombre`, `fechaEmision`, `fechaVencimiento` (opcional → alimenta alertas de vencimiento)
  - campos opcionales Conservador: `fojas`, `numero`, `anio`

### Contratos de arriendo
- **Tenant / Arrendatario** — `nombre`, `rut`, `email`, `telefono` (solo datos, sin portal).
- **LeaseContract** (Contrato)
  - `propertyId`, `tenantId`, `monto`, `moneda` (CLP/UF)
  - `reajusteTipo` (ninguno / IPC / UF), `reajusteFrecuencia` (semestral / anual), `aplicaReajuste` (bool)
  - `fechaInicio`, `fechaTermino`, `diaPago`
  - `estado` (vigente / por vencer / vencido / renovado / terminado)
  - *(post-MVP: garantía, multas, renovación automática)*

### Control económico
- **Movement** (Movimiento: ingreso o gasto)
  - `propertyId`, `tipo` (ingreso/gasto), `categoria` (arriendo, reparación, gasto común, seguro, impuesto, otro), `monto`, `moneda`, `fecha`, `descripcion`, `documentId` opcional
- **RentCharge** (Cobro de arriendo por período)
  - `contractId`, `periodo` (mes/año), `montoEsperado`, `fechaVencimiento`
  - `estado` (pendiente / pagado / atrasado), `fechaPago`, `montoPagado`
  - `interesMora` (ingresado **manual** en MVP), `notas`
- **PropertyTax / Contribución**
  - `propertyId`, `anio`, `cuota` (1-4), `monto`, `fechaVencimiento`, `estado` (pendiente/pagada), `fechaPago` — ingreso manual en MVP.

### Soporte
- **CurrencyValue** — `fecha`, `tipo` (UF/IPC), `valor` — ingreso manual en MVP; permite convertir entre CLP y UF en informes.
- **Alert** — `tipo`, `propertyId`/`contractId`, `severidad`, `mensaje`, `estado` (activa/resuelta), `fechaCreacion`. Generadas por reglas (ver módulo 4 de alcance).

---

## 4. Módulos del MVP y alcance

### ✅ Dentro del MVP
1. **Cuentas, roles y multi-tenant** — login, organizaciones (clientes), 4 roles, un usuario en varias organizaciones.
2. **Gestión de propiedades** — alta/edición, tipos, ROL, ubicación, estado, objetivo, etiquetas libres, dueños con % (copropiedad).
3. **Documental** — subir archivos (PDF/fotos) clasificados por propiedad, con fecha de vencimiento opcional.
4. **Contratos de arriendo** — crear contrato (UF o CLP), datos de reajuste, fechas, estados; vincular arrendatario.
5. **Control económico** — registrar ingresos/gastos por propiedad; cobros de arriendo por período con estado de pago; contribuciones (manual); vista de **cartera** con categorías y rentabilidad por propiedad.
6. **Alertas y autocontrol** (panel + email) — reglas prioritarias:
   - Propiedad arrendada sin contrato cargado.
   - Contrato por vencer (ej: 60 días antes).
   - Arriendo atrasado (cobro pendiente vencido).
   - Contribución por pagar/vencida.
   - Propiedad desocupada hace X meses.
7. **Informes** — resumen ejecutivo de la cartera + rentabilidad, exportables a **PDF y Excel**. Multimoneda con opción "ver todo en una sola moneda".
8. **Dashboard** — vista de entrada con KPIs (n° propiedades, ocupación, ingresos del mes, alertas activas).
9. **Buscador inteligente (IA)** — barra de comandos en lenguaje natural para llegar directo a una propiedad (ej: *"llévame al departamento de Providencia"*) y preguntas simples sobre la cartera. Es la primera capa de la IA (ver §5).

### 🔜 Fuera del MVP (v2 / v3)
- Pasarela de pago de la suscripción + auto-registro (self-service).
- Portal para arrendatarios.
- **Asistente conversacional completo + RAG sobre documentos** (preguntas sobre el contenido de contratos/escrituras), **OCR / análisis de documentos con IA** y agente que valida que el arriendo se pague según el contrato (ver §5).
- Cálculo **automático** de intereses/mora (varias fórmulas), garantías, multas, renovación automática.
- Envío automático de solicitudes de pago (email/WhatsApp) y emisión de **boleta/factura electrónica SII**.
- Conciliación bancaria (carga de cartola).
- Integraciones automáticas: **SII** (contribuciones, facturación), **Conservador**, **Tesorería**, valores **UF/IPC** desde Banco Central.
- Agrupación de propiedades (edificios) y subdivisión de un ROL en varias unidades arrendables.
- Módulo de mantención/presupuestos completo (en MVP se cubre básico vía gastos con categoría "reparación").

---

## 5. Capa de IA / Agentes

Proges integra IA **dentro de la app** para que el usuario resuelva preguntas y navegue en lenguaje natural, sin aprender a usar filtros ni menús.

### Cómo funciona: agente con herramientas
Un agente es un modelo (Claude) al que se le dan **herramientas** (funciones que programamos) y él decide cuál usar según la pregunta. El modelo **no inventa datos**: los lee de tu base de datos a través de esas herramientas. Ejemplos de herramientas:

- `buscarPropiedades(filtros)` → consulta propiedades.
- `obtenerFinanzasDePropiedad(id)` → ingresos/gastos/rentabilidad.
- `listarContratosPorVencer(dias)` → contratos próximos a vencer.
- `irAPropiedad(id)` → navega la app a la ficha (acción, no solo respuesta).
- `buscarEnDocumentos(texto)` → busca dentro de los PDFs subidos (vía RAG, post-MVP).

### Dos capacidades, en distintos momentos
| Capacidad | Qué hace | Complejidad | Cuándo |
|---|---|---|---|
| **Buscador inteligente** | "Llévame a la propiedad X"; preguntas simples sobre la cartera. | Baja | **MVP** (módulo 9). Alto impacto, poco esfuerzo. |
| **Asistente conversacional** | Q&A sobre datos estructurados (rentabilidad, vencimientos, ocupación). | Media | **v1.5**, con el modelo de datos ya firme. |
| **RAG sobre documentos** | Preguntas sobre el contenido de contratos/escrituras; validar que el arriendo se pague según contrato. | Alta | **Post-MVP**, junto con OCR/análisis de documentos. |

### RAG sobre documentos (post-MVP)
Para preguntar sobre el **contenido** de los PDFs, se indexa el texto de cada documento como "embeddings" (representaciones numéricas) y se guardan en Postgres con **`pgvector`** — sin agregar otra base de datos. Al preguntar, el sistema recupera los fragmentos relevantes y se los pasa al modelo para responder con cita a la fuente.

### Seguridad (crítico)
El agente **solo accede a los datos del cliente activo**. Cada herramienta filtra **obligatoriamente** por `organizationId`; nunca se confía en que "el modelo se porte bien". Esto evita filtrar datos de un cliente a otro.

### Impacto en el diseño desde ahora
Aunque el grueso de la IA es post-MVP, el modelo de datos ya se diseña para soportarla: datos limpios y relacionados, documentos subidos dentro de la app y `pgvector` disponible en Postgres.

---

## 6. Roadmap por fases

Estimación para una persona construyendo con Claude. Las fases son secuenciales pero el orden permite tener algo demostrable temprano.

| Fase | Foco | Entregable |
|------|------|-----------|
| **0. Setup** (semana 1) | Proyecto Next.js + Tailwind/shadcn, Clerk, Postgres/Prisma, deploy en Vercel. | App vacía corriendo en producción con login. |
| **1. Propiedades + multi-tenant** (semanas 2-3) | Organizaciones, roles, CRUD de propiedades, dueños/copropiedad, etiquetas. | Puedo crear un cliente y cargar su cartera de propiedades. |
| **2. Documental** (semana 4) | Subida de archivos a Blob, clasificación, vencimientos. | Cada propiedad tiene sus documentos adjuntos. |
| **3. Contratos** (semanas 5-6) | Arrendatarios, contratos multimoneda, datos de reajuste, estados. | Puedo registrar los arriendos de la cartera. |
| **4. Control económico** (semanas 7-8) | Ingresos/gastos, cobros de arriendo, contribuciones, vista de cartera + rentabilidad. | Veo la situación financiera por propiedad y consolidada. |
| **5. Alertas** (semana 9) | Motor de reglas + panel + emails. | El sistema avisa inconsistencias y vencimientos. |
| **6. Informes** (semana 10) | Resumen ejecutivo y rentabilidad en PDF/Excel, multimoneda. | El dueño/contador descarga sus informes. |
| **7. Buscador inteligente (IA)** (semana 11) | Barra de comandos en lenguaje natural con AI SDK + tool calling (navegar a propiedad, preguntas simples). | Encuentro y abro propiedades hablándole a la app. |
| **8. Pulido + piloto** (semana 12) | Dashboard, UX, carga de datos reales de un cliente piloto, ajustes. | MVP usable por un cliente real. |

---

## 7. Decisiones clave y supuestos

- **Multimoneda:** cada propiedad/contrato guarda su moneda (CLP o UF). Para sumar/comparar en informes, se convierte usando la tabla `CurrencyValue` (UF ingresada manualmente en MVP).
- **Mora:** en MVP el administrador ingresa el monto de interés a mano; el sistema solo lo registra y muestra.
- **Documental:** los archivos se suben **dentro de la app** (no link externo) para poder analizarlos con IA más adelante.
- **Sin pasarela de pago** en MVP: las cuentas se activan manualmente tras la venta.
- **Diseñar pensando en el futuro** (sin construirlo aún): agrupación de propiedades, subdivisión en unidades, integraciones SII/Conservador. El modelo de datos no debe cerrarse a esto.

- **IA con datos propios:** el agente responde leyendo tu base de datos vía herramientas (no inventa). El buscador inteligente entra en MVP; el asistente conversacional completo y el RAG sobre documentos van después (ver §5).

---

## 8. Próximos pasos

1. Validar/ajustar este plan.
2. **Fase 0 — Setup:** scaffolding del proyecto (Next.js + shadcn + Clerk + Prisma/Postgres) y primer deploy.
3. Una vez exista el esqueleto, correr `/init` para generar el `CLAUDE.md` del proyecto.
4. Conseguir datos reales de una cartera para usar como piloto.
