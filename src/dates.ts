// A date n days from today as yyyy-mm-dd, the format the setup project gives ERPNext
export function daysFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}