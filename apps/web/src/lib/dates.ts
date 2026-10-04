export const today = () => new Date().toISOString().slice(0, 10);
export function formatDate(value: string): string {
  const date = value.slice(0, 10).split('-');
  return date.length === 3 ? `${date[2]}/${date[1]}/${date[0]}` : value;
}
export function currentMonth(): { month: number; year: number } {
  const date = new Date();
  return { month: date.getMonth() + 1, year: date.getFullYear() };
}
