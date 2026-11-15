export type WorkerPageLocale = "en" | "es";

type Strings = Record<string, string | ((n: number) => string)>;

export const WORKER_PAGE_STRINGS: Record<WorkerPageLocale, Strings> = {
  en: {
    verified: "Verified",
    unavailable: "Unavailable",
    workerUnavailable: "Worker unavailable",
    qrInactive: "This QR code is no longer active.",
    teamMember: "Adams Electric Team Member",
    company: "Company",
    department: "Department",
    businessUnit: "Business Unit",
    notAssigned: "Not assigned",
    activeWorker: "Active worker",
    inactiveWorker: "Inactive worker",
    certifications: "Certifications",
    certRecords: (n: number) => `${n} certification record${n === 1 ? "" : "s"}`,
    noCerts: "No certifications are currently on file",
    completed: "Completed",
    expires: "Expires",
    expired: "Expired",
    expiresIn: (d: number) => `Expires in ${d} days`,
    current: "Current",
    noExpiration: "No expiration",
    notProvided: "Not provided",
    hours: "hours",
    safetyView: "Safety personnel: view emergency contacts",
    safetySignIn: "Sign in with an Adams Safety account to view this section.",
    safetyError: "Unable to load — try again.",
    emergencyContacts: "Emergency Contacts",
    noPhone: "No phone on file",
    noContacts: "No emergency contacts on file.",
    safetyViewOf: "Safety personnel view",
  },
  es: {
    verified: "Verificado",
    unavailable: "No disponible",
    workerUnavailable: "Trabajador no disponible",
    qrInactive: "Este código QR ya no está activo.",
    teamMember: "Miembro del equipo de Adams Electric",
    company: "Empresa",
    department: "Departamento",
    businessUnit: "Unidad de negocio",
    notAssigned: "No asignado",
    activeWorker: "Trabajador activo",
    inactiveWorker: "Trabajador inactivo",
    certifications: "Certificaciones",
    certRecords: (n: number) => `${n} registro${n === 1 ? "" : "s"} de certificación`,
    noCerts: "No hay certificaciones registradas",
    completed: "Completado",
    expires: "Vence",
    expired: "Vencida",
    expiresIn: (d: number) => `Vence en ${d} días`,
    current: "Vigente",
    noExpiration: "Sin vencimiento",
    notProvided: "No proporcionado",
    hours: "horas",
    safetyView: "Personal de seguridad: ver contactos de emergencia",
    safetySignIn: "Inicie sesión con una cuenta de Seguridad de Adams para ver esta sección.",
    safetyError: "No se pudo cargar — inténtelo de nuevo.",
    emergencyContacts: "Contactos de emergencia",
    noPhone: "Sin teléfono registrado",
    noContacts: "No hay contactos de emergencia registrados.",
    safetyViewOf: "Vista del personal de seguridad",
  },
};

export type WorkerStrings = Strings;

export function workerT(locale: WorkerPageLocale) {
  const strings = WORKER_PAGE_STRINGS[locale] || WORKER_PAGE_STRINGS.en;
  return (key: keyof (typeof WORKER_PAGE_STRINGS)["en"], arg?: number): string => {
    const value = strings[key as string] ?? WORKER_PAGE_STRINGS.en[key as string];
    return typeof value === "function" ? value(arg ?? 0) : (value ?? String(key));
  };
}
