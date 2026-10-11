// Formatting helpers (pt-AO). Deterministic on server and client so static
// HTML and hydrated HTML match: no locale-dependent Intl grouping for money.

/** Non-breaking space used as thousands separator and before "Kz". */
export const NBSP = " ";

/** Groups digits with a non-breaking space: 1200 -> "1 200". */
export function formatNumber(value: number): string {
  const sign = value < 0 ? "-" : "";
  const digits = Math.round(Math.abs(value)).toString();
  return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
}

/** 1200 -> "1 200 Kz" (non-breaking spaces throughout). */
export function formatKz(value: number): string {
  return `${formatNumber(value)}${NBSP}Kz`;
}

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

// Luanda is UTC+1 all year (no DST). Formatting in a fixed zone keeps server
// and browser output identical.
const LUANDA_OFFSET_MS = 60 * 60 * 1000;

function parts(iso: string) {
  const d = new Date(new Date(iso).getTime() + LUANDA_OFFSET_MS);
  return {
    day: d.getUTCDate(),
    month: d.getUTCMonth(),
    year: d.getUTCFullYear(),
    hh: String(d.getUTCHours()).padStart(2, "0"),
    mm: String(d.getUTCMinutes()).padStart(2, "0"),
  };
}

/** "11 out 2026" */
export function formatDate(iso: string): string {
  const p = parts(iso);
  return `${p.day} ${MONTHS[p.month]} ${p.year}`;
}

/** "14:05" */
export function formatTime(iso: string): string {
  const p = parts(iso);
  return `${p.hh}:${p.mm}`;
}

/** "11 out 2026, 14:05" */
export function formatDateTime(iso: string): string {
  return `${formatDate(iso)}, ${formatTime(iso)}`;
}

/** "há 5 min", "há 3 h", "ontem", else the date. Pass `now` for stable output. */
export function formatRelative(iso: string, now: number = Date.now()): string {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora mesmo";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  if (h < 48) return "ontem";
  return formatDate(iso);
}

/** Phone as typed by humans in Angola: "+244 923 456 789". */
export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  const local = digits.startsWith("244") ? digits.slice(3) : digits;
  if (local.length !== 9) return raw;
  return `+244 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
}
