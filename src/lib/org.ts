// Costura multi-tenant. Punto único desde donde sale el organizationId.
//
// HOY (single-tenant): devuelve una constante fija.
// MAÑANA (al integrar Clerk, en el deploy): pasará a leer la organización activa
//   del usuario con `await auth()` — y como ya es async, NINGÚN call site cambia.
//
// Regla: TODA consulta a la base filtra por este valor. Nunca hardcodear el orgId
// en otro lado; siempre `const orgId = await getOrgId()`.

export const DEFAULT_ORG_ID = "org_proges";

export async function getOrgId(): Promise<string> {
  return DEFAULT_ORG_ID;
}
