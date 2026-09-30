const EMPLOYEE_KEY = "asistencia_token";
const PARTNER_KEY = "asistencia_partner_token";

function read(key: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(key);
}

function write(key: string, value: string | null) {
  if (typeof window === "undefined") return;
  if (value) window.localStorage.setItem(key, value);
  else window.localStorage.removeItem(key);
}

export const employeeAuth = {
  getToken: () => read(EMPLOYEE_KEY),
  setToken: (token: string) => write(EMPLOYEE_KEY, token),
  clear: () => write(EMPLOYEE_KEY, null),
};

export const partnerAuth = {
  getToken: () => read(PARTNER_KEY),
  setToken: (token: string) => write(PARTNER_KEY, token),
  clear: () => write(PARTNER_KEY, null),
};

const EMPLOYEE_REMEMBERED_CODE_KEY = "asistencia_remembered_code";
const PARTNER_REMEMBERED_CODE_KEY = "asistencia_partner_remembered_code";

export const rememberedEmployeeCode = {
  get: () => read(EMPLOYEE_REMEMBERED_CODE_KEY),
  set: (code: string) => write(EMPLOYEE_REMEMBERED_CODE_KEY, code),
  clear: () => write(EMPLOYEE_REMEMBERED_CODE_KEY, null),
};

export const rememberedPartnerCode = {
  get: () => read(PARTNER_REMEMBERED_CODE_KEY),
  set: (code: string) => write(PARTNER_REMEMBERED_CODE_KEY, code),
  clear: () => write(PARTNER_REMEMBERED_CODE_KEY, null),
};

const SOLMAT_NOTES_KEY = "asistencia_solmat_notes";
const SOLMAT_NOTES_MAX = 300;

function readSolmatNotes(): string[] {
  const raw = read(SOLMAT_NOTES_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((n) => typeof n === "string") : [];
  } catch {
    return [];
  }
}

// Notas ya solicitadas en este dispositivo: sirven de sugerencia al teclear una nueva
export const solmatNotes = {
  get: readSolmatNotes,
  add: (notes: string[]) => {
    const merged: string[] = [];
    const seen = new Set<string>();
    for (const note of [...notes, ...readSolmatNotes()]) {
      const clean = note.trim();
      const id = clean.toLowerCase();
      if (!clean || seen.has(id)) continue;
      seen.add(id);
      merged.push(clean);
    }
    write(SOLMAT_NOTES_KEY, JSON.stringify(merged.slice(0, SOLMAT_NOTES_MAX)));
  },
};

const PARTE_DRAFT_KEY = "asistencia_parte_draft";
const PARTE_DRAFT_PARTNER_KEY = "asistencia_parte_draft_partner";

export interface ParteDraft {
  attendanceId: number;
  workedHours: number;
  budgets: { id: number; code: string; name: string; company_id: number | false }[];
  products: { id: number; name: string; company_ids: number[] }[];
}

function readDraft(key: string): ParteDraft | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ParteDraft;
  } catch {
    return null;
  }
}

export const parteDraft = {
  get: () => readDraft(PARTE_DRAFT_KEY),
  set: (draft: ParteDraft) =>
    window.sessionStorage.setItem(PARTE_DRAFT_KEY, JSON.stringify(draft)),
  clear: () => window.sessionStorage.removeItem(PARTE_DRAFT_KEY),
};

export const parteDraftPartner = {
  get: () => readDraft(PARTE_DRAFT_PARTNER_KEY),
  set: (draft: ParteDraft) =>
    window.sessionStorage.setItem(PARTE_DRAFT_PARTNER_KEY, JSON.stringify(draft)),
  clear: () => window.sessionStorage.removeItem(PARTE_DRAFT_PARTNER_KEY),
};
