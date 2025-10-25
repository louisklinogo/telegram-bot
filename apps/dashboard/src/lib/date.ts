export function formatDateUTC(dateLike: string | number | Date | null | undefined): string {
  if (dateLike == null) return "";
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return "";
  // Use UTC to avoid server/client timezone differences
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}
