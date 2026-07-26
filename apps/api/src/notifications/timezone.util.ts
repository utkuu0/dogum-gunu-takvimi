/**
 * Verilen IANA zaman dilimindeki (örn. "Europe/Istanbul") "bugünü" saat/dakikadan
 * arındırılmış bir UTC Date olarak döner — getNextBirthdayInfo'nun beklediği format.
 * Geçersiz bir zaman dilimi verilirse UTC'ye düşer.
 */
export function getLocalDateInTimezone(timezone: string, reference: Date = new Date()): Date {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(reference);

    const year = Number(parts.find((p) => p.type === 'year')?.value);
    const month = Number(parts.find((p) => p.type === 'month')?.value);
    const day = Number(parts.find((p) => p.type === 'day')?.value);

    return new Date(Date.UTC(year, month - 1, day));
  } catch {
    return new Date(
      Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate())
    );
  }
}
