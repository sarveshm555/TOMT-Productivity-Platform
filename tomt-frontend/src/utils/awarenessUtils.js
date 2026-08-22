/**
 * Helper utility for validating local user answers for the Daily Awareness Check.
 * Uses browser local time (new Date()).
 */

const MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'
];

const SHORT_MONTH_NAMES = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
];

const WEEKDAY_NAMES = [
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'
];

const SHORT_WEEKDAY_NAMES = [
  'sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'
];

/**
 * Returns formatted string representation of today's date & day in local browser time.
 * E.g., { date: "22 August 2026", day: "Saturday" }
 */
export function getTodayAwarenessAnswers() {
  const now = new Date();
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
  const dayNum = now.getDate();
  const monthName = now.toLocaleDateString('en-US', { month: 'long' });
  const year = now.getFullYear();

  return {
    date: `${dayNum} ${monthName} ${year}`,
    day: dayName,
  };
}

/**
 * Validates day input (case-insensitive, e.g. "Saturday", "saturday", "SAT", "sat").
 */
export function validateDayAnswer(userDayStr) {
  if (!userDayStr || typeof userDayStr !== 'string') return false;
  const cleanInput = userDayStr.trim().toLowerCase();
  if (!cleanInput) return false;

  const now = new Date();
  const actualWeekdayIndex = now.getDay(); // 0-6
  const actualLong = WEEKDAY_NAMES[actualWeekdayIndex];
  const actualShort = SHORT_WEEKDAY_NAMES[actualWeekdayIndex];

  return cleanInput === actualLong || cleanInput === actualShort;
}

/**
 * Validates date input flexibly against today's local date.
 * Accepts formats like:
 * - "22 August 2026", "22 Aug 2026", "22 August, 2026", "August 22, 2026"
 * - "22/08/2026", "22/8/2026", "22-08-2026", "22.08.2026"
 * - "2026-08-22"
 */
export function validateDateAnswer(userDateStr) {
  if (!userDateStr || typeof userDateStr !== 'string') return false;
  const cleanInput = userDateStr.trim().toLowerCase();
  if (!cleanInput) return false;

  const now = new Date();
  const targetDay = now.getDate();
  const targetMonthIndex = now.getMonth(); // 0-11
  const targetYear = now.getFullYear();

  // 1. Try parsing user string directly via Date
  const parsed = new Date(userDateStr);
  if (!isNaN(parsed.getTime())) {
    if (
      parsed.getDate() === targetDay &&
      parsed.getMonth() === targetMonthIndex &&
      parsed.getFullYear() === targetYear
    ) {
      return true;
    }
  }

  // 2. Flexible regex parsing (e.g. "22/08/2026", "22-8-2026", "2026-08-22")
  const numbers = cleanInput.match(/\d+/g);
  if (numbers && numbers.length >= 3) {
    const numVals = numbers.map((n) => parseInt(n, 10));
    // Case A: Day Month Year (e.g. 22, 8, 2026)
    if (numVals[0] === targetDay && (numVals[1] === targetMonthIndex + 1) && numVals[2] === targetYear) {
      return true;
    }
    // Case B: Year Month Day (e.g. 2026, 8, 22)
    if (numVals[0] === targetYear && (numVals[1] === targetMonthIndex + 1) && numVals[2] === targetDay) {
      return true;
    }
    // Case C: Month Day Year (e.g. 8, 22, 2026)
    if (numVals[0] === targetMonthIndex + 1 && numVals[1] === targetDay && numVals[2] === targetYear) {
      return true;
    }
  }

  // 3. String containment check for day, month name/number, and year
  const containsDay = cleanInput.includes(targetDay.toString());
  const monthLong = MONTH_NAMES[targetMonthIndex];
  const monthShort = SHORT_MONTH_NAMES[targetMonthIndex];
  const containsMonth = cleanInput.includes(monthLong) || cleanInput.includes(monthShort) || (numbers && numbers.some(n => parseInt(n, 10) === targetMonthIndex + 1));
  const containsYear = cleanInput.includes(targetYear.toString());

  if (containsDay && containsMonth && containsYear) {
    return true;
  }

  return false;
}
