export function toDisplayDate(value: any, fallbackValue?: any): Date | null {
  const primary = normalizeDate(value);
  if (primary) return primary;
  return normalizeDate(fallbackValue);
}

function normalizeDate(value: any): Date | null {
  if (!value) return null;
  if (typeof value?.toDate === 'function') {
    const d = value.toDate();
    return isValidDate(d) ? d : null;
  }
  const d = new Date(value);
  return isValidDate(d) ? d : null;
}

function isValidDate(d: Date): boolean {
  return d instanceof Date && !Number.isNaN(d.getTime()) && d.getTime() > 0;
}

