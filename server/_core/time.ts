const BRAZIL_TIMEZONE = "America/Sao_Paulo";

const timestampFormatter = new Intl.DateTimeFormat("sv-SE", {
  timeZone: BRAZIL_TIMEZONE,
  hour12: false,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

export function getBrazilTimestamp(date: Date = new Date()): string {
  // sv-SE locale returns `YYYY-MM-DD HH:mm:ss`; convert space to `T` to resemble ISO.
  return timestampFormatter.format(date).replace(" ", "T");
}
