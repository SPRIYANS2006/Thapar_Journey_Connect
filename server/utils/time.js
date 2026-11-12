// Time and date calculations in Asia/Kolkata (IST)

export function getNowIST() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const parts = formatter.formatToParts(now);
  const getPart = (type) => parts.find((p) => p.type === type)?.value;
  const dateStr = `${getPart('year')}-${getPart('month')}-${getPart('day')}`;
  const timeStr = `${getPart('hour')}:${getPart('minute')}`;
  return { dateStr, timeStr, now };
}

// Convert "HH:mm" to minutes from midnight (0..1439)
export function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map((n) => parseInt(n, 10) || 0);
  return (h % 24) * 60 + (m % 60);
}

// Calculate true minute difference between two departures.
// When full dates are provided, compares absolute timestamps.
// On the same calendar date, 00:05 and 23:55 are correctly 1430 minutes apart (not 10m).
export function getDepartureMinuteDiff(dateA, timeA, dateB, timeB) {
  if (dateA && dateB && timeA && timeB) {
    const normA = normalizeDateStr(dateA);
    const normB = normalizeDateStr(dateB);
    const msA = new Date(`${normA}T${timeA}:00+05:30`).getTime();
    const msB = new Date(`${normB}T${timeB}:00+05:30`).getTime();
    if (!isNaN(msA) && !isNaN(msB)) {
      return Math.round(Math.abs(msA - msB) / 60000);
    }
  }
  const minA = timeToMinutes(timeA);
  const minB = timeToMinutes(timeB);
  return Math.abs(minA - minB);
}

// Minute difference on same day
export function getCircularMinuteDiff(timeA, timeB) {
  const minA = timeToMinutes(timeA);
  const minB = timeToMinutes(timeB);
  return Math.abs(minA - minB);
}

// Helper to convert date strings like "Today", "Tomorrow", or "YYYY-MM-DD" to standard "YYYY-MM-DD"
export function normalizeDateStr(dateStr) {
  if (!dateStr) return getNowIST().dateStr;
  const s = String(dateStr).trim();
  const { dateStr: todayStr, now } = getNowIST();

  if (/^today$/i.test(s)) {
    return todayStr;
  }
  if (/^tomorrow$/i.test(s)) {
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return fmt.format(tomorrow);
  }

  // If matches YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return s;
  }

  // Handle human formats like "Fri, Oct 31"
  const clean = s.replace(/^[A-Za-z]+,\s*/, '').replace(/^[A-Za-z]+\s*\([^)]*\)\s*/, '');
  const parsed = Date.parse(`${clean} ${now.getFullYear()}`);
  if (!isNaN(parsed)) {
    const d = new Date(parsed);
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return fmt.format(d);
  }

  return s;
}

// Calculates exact hours until departure (negative if past)
export function getHoursUntilDeparture(dateStr, timeStr) {
  if (!timeStr) return 999;
  const normalizedDate = normalizeDateStr(dateStr);
  const [hStr, mStr] = (timeStr || '').split(':');
  const h = (hStr || '00').padStart(2, '0');
  const m = (mStr || '00').padStart(2, '0');

  // Parse in Asia/Kolkata offset (+05:30)
  const isoWithOffset = `${normalizedDate}T${h}:${m}:00+05:30`;
  const targetMs = Date.parse(isoWithOffset);
  if (isNaN(targetMs)) return 999;

  const diffMs = targetMs - Date.now();
  return diffMs / (1000 * 60 * 60);
}

// Validate date is not past and within 15-day window
export function validateTravelDateTime(dateStr, timeStr) {
  const normalized = normalizeDateStr(dateStr);
  const hoursLeft = getHoursUntilDeparture(normalized, timeStr);

  // Allow 5 minutes clock skew margin for "just departing"
  if (hoursLeft < -5 / 60) {
    return { valid: false, error: 'Departure time cannot be in the past.' };
  }

  // Maximum 15 days in future (15 * 24 = 360 hours)
  if (hoursLeft > 360 + 24) {
    return { valid: false, error: 'Departure date must be within the next 15 days.' };
  }

  return { valid: true, normalizedDate: normalized };
}
