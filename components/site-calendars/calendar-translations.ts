/**
 * Default Spanish translations for common seeded/demo site-calendar entries.
 * These are used as a fallback when a calendar item does not already have
 * titleEs / descriptionEs stored in Firestore.
 */

export const CALENDAR_TITLE_TRANSLATIONS: Record<string, string> = {
  "Safety Stand-Down": "Reunión de Seguridad",
  "Fall Protection Delivery": "Entrega de Protección contra Caídas",
  "Foreman Meeting": "Reunión de Capataces",
  "Tool Box Talk": "Charla de Caja de Herramientas",
  "Site Inspection": "Inspección del Sitio",
};

export const CALENDAR_DESCRIPTION_TRANSLATIONS: Record<string, string> = {
  "Morning safety briefing and PPE check": "Charla matutina de seguridad y revisión de EPP",
  "$25k of fall protection gear arriving — check mailbox": "Llega equipo de protección contra caídas por valor de $25,000 — revisar buzón",
  "Review weekly schedule and manpower": "Revisar la programación semanal y la mano de obra",
  "Lockout/tagout refresher with crew": "Recordatorio de bloqueo/etiquetado con la cuadrilla",
  "Superintendent walk-through with safety lead": "Recorrido del superintendente con el líder de seguridad",
};

export function getCalendarTitleEs(itemTitle: string): string | undefined {
  return CALENDAR_TITLE_TRANSLATIONS[itemTitle];
}

export function getCalendarDescriptionEs(itemDescription?: string): string | undefined {
  if (!itemDescription) return undefined;
  return CALENDAR_DESCRIPTION_TRANSLATIONS[itemDescription];
}
