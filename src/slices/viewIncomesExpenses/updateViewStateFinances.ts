import type { Event } from '../shared/genericTypes';
import { openEventDB } from "../../utils/openEventDB";

type ViewState = {
  incomes: {
    description: string;
    amount: number;
    changeId: string;
  }[];
  expenses: {
    description: string;
    amount: number;
    changeId: string;
  }[];
  net: number;
};

export async function updateViewStateFinances(events: Event[], versionId: string) {
  try {
    const db = await openEventDB(); // Ensures stores exist

    const result: Record<string, ViewState> = {};

    console.log("📤 Writing to view_state_incomes_expenses", result);


    for (const event of events) {
      if (event.type !== "IncomeAdded" && event.type !== "ExpenseAdded") continue;

      const start = new Date(event.period.start);
      const end = new Date(event.period.end);
      const current = new Date(start);

      while (current <= end) {
        const monthKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;

        if (!result[monthKey]) {
          result[monthKey] = { incomes: [], expenses: [], net: 0 };
        }

        const entry = {
          description: event.description,
          amount: event.amount,
          changeId: event.belongsTo || "unknown",
        };

        if (event.type === "IncomeAdded") {
          result[monthKey].incomes.push(entry);
          result[monthKey].net += entry.amount;
        } else {
          result[monthKey].expenses.push(entry);
          result[monthKey].net -= entry.amount;
        }

        current.setMonth(current.getMonth() + 1);
      }
    }

    const tx = db.transaction("view_state_incomes_expenses", "readwrite");
    const store = tx.objectStore("view_state_incomes_expenses");
    await store.put(result, versionId);
    await tx.done;
  } catch (err) {
    console.error("Failed to update view_state_incomes_expenses:", err);
  }
}
