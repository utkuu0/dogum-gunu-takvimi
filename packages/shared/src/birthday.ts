function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function startOfUTCDate(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export interface NextBirthdayInfo {
  /** ISO 8601 tarih (yyyy-MM-dd) — o yılki (gerekirse kaydırılmış) kutlama günü */
  nextBirthdayDate: string;
  daysUntil: number;
  turningAge: number;
}

/**
 * Bir sonraki doğum gününe kaç gün kaldığını ve o gün kaç yaşına girileceğini hesaplar.
 * 29 Şubat doğumlular, artık yılı olmayan yıllarda 28 Şubat'ta kutlanmış sayılır.
 */
export function getNextBirthdayInfo(
  birthDate: string | Date,
  today: string | Date = new Date()
): NextBirthdayInfo {
  const birth = startOfUTCDate(new Date(birthDate));
  const now = startOfUTCDate(new Date(today));

  const birthMonth = birth.getUTCMonth();
  const birthDay = birth.getUTCDate();
  const birthYear = birth.getUTCFullYear();

  function birthdayInYear(year: number): Date {
    if (birthMonth === 1 && birthDay === 29 && !isLeapYear(year)) {
      return new Date(Date.UTC(year, 1, 28));
    }
    return new Date(Date.UTC(year, birthMonth, birthDay));
  }

  let candidate = birthdayInYear(now.getUTCFullYear());
  if (candidate.getTime() < now.getTime()) {
    candidate = birthdayInYear(now.getUTCFullYear() + 1);
  }

  const msPerDay = 24 * 60 * 60 * 1000;
  const daysUntil = Math.round((candidate.getTime() - now.getTime()) / msPerDay);
  const turningAge = candidate.getUTCFullYear() - birthYear;

  return {
    nextBirthdayDate: candidate.toISOString().slice(0, 10),
    daysUntil,
    turningAge,
  };
}
