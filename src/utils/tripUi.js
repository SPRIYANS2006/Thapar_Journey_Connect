export function istDate(offset = 0) {
  return new Date(Date.now() + offset * 86400000).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
}
export function tripDate(date) {
  const parsed = new Date(`${date}T12:00:00+05:30`);
  return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short' });
}
export const tripInput = 'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500';
export const tripButton = 'inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
