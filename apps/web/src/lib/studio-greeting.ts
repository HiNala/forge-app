/** Warm greeting by time of day (user's local clock). */
export function timeOfDayGreeting(firstName: string): string {
  const h = new Date().getHours();
  if (h < 12) return `Good morning, ${firstName}`;
  if (h < 18) return `Afternoon, ${firstName}`;
  return `Evening, ${firstName}`;
}
