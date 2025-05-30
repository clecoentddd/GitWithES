export function formatMonthDisplay(monthKey: string): string {
    const [year, month] = monthKey.split("-");
    const date = new Date(Number(year), Number(month) - 1);
    return date.toLocaleString("default", { month: "long", year: "numeric" });
  }
  