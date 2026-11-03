// Frontend time formatting helpers

// Helper to convert HH:MM string to total minutes from midnight
export function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// Format time from minutes back to HH:MM AM/PM
export function formatMinutesToTime(totalMinutes) {
  let hrs = Math.floor(totalMinutes / 60) % 24;
  const mins = totalMinutes % 60;
  const ampm = hrs >= 12 ? 'PM' : 'AM';
  hrs = hrs % 12;
  hrs = hrs ? hrs : 12;
  const minsStr = mins < 10 ? `0${mins}` : mins;
  return `${hrs}:${minsStr} ${ampm}`;
}

// Format HH:MM 24hr string to 12hr AM/PM string
export function formatTime24to12(time24) {
  if (!time24) return '';
  if (typeof time24 !== 'string') return String(time24);
  if (time24.includes('AM') || time24.includes('PM')) return time24;
  const parts = time24.split(':');
  if (parts.length < 2) return time24;
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (isNaN(h) || isNaN(m)) return time24;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 || 12;
  const displayM = m < 10 ? `0${m}` : m;
  return `${displayH}:${displayM} ${ampm}`;
}

// Generate 96 15-minute slot options for selects (e.g. 5:00 AM, 5:15 AM, 5:30 AM...)
export function generate15MinuteSlots() {
  const slots = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hh = String(h).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      const time24 = `${hh}:${mm}`;
      const time12 = formatTime24to12(time24);
      slots.push({
        value: time24,
        label: `${time12} (${time24})`
      });
    }
  }
  return slots;
}

export const TIME_SLOT_OPTIONS_15MIN = generate15MinuteSlots();
