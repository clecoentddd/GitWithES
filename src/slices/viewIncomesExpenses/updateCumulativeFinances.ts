// src/projections/updateCumulativeFinances.ts
import { Event } from "../shared/genericTypes";
import { openEventDB } from "../../utils/openEventDB";

export async function updateCumulativeFinances(events: Event[], replayVersionId: string) {
  const changeEvents = events.filter(
    (e): e is Extract<Event, { type: "ChangePublished" | "ChangeCancelled" }> =>
      e.type === "ChangePublished" || e.type === "ChangeCancelled"
  );

  const changeMap = new Map<string, { type: "published" | "cancelled"; timestamp: number }>();
  for (const ev of changeEvents) {
    changeMap.set(ev.changeId, {
      type: ev.type === "ChangePublished" ? "published" : "cancelled",
      timestamp: ev.timestamp,
    });
  }

  const cutoffIndex = changeEvents.findIndex(ev => ev.changeId === replayVersionId);
  if (cutoffIndex === -1) return;

  const relevantIds = changeEvents.slice(0, cutoffIndex + 1).map(ev => ev.changeId);

  const versionEvents = events.filter(
    (e): e is Extract<Event, { type: "IncomeAdded" | "ExpenseAdded" }> =>
      (e.type === "IncomeAdded" || e.type === "ExpenseAdded") &&
      relevantIds.includes(e.belongsTo)
  );

  const result: Record<string, any> = {};

  versionEvents.forEach(event => {
    const change = changeMap.get(event.belongsTo);
    const start = new Date(event.period.start);
    const end = new Date(event.period.end);
    let current = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
    const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));

    const changeType: "published" | "cancelled" =
      change?.type === "published" || change?.type === "cancelled"
        ? change.type
        : "published";

    while (current <= last) {
      const year = current.getUTCFullYear();
      const month = (current.getUTCMonth() + 1).toString().padStart(2, "0");
      const key = `${year}-${month}`;

      if (!result[key]) {
        result[key] = {
          incomes: [],
          expenses: [],
          net: 0,
        };
      }

      const entry = {
        amount: event.amount,
        description: event.description,
        changeId: event.belongsTo,
        changeTimestamp: change?.timestamp || 0,
        changeType,
      };

      if (event.type === "IncomeAdded") {
        result[key].incomes.push(entry);
        result[key].net += event.amount;
      } else {
        result[key].expenses.push(entry);
        result[key].net -= event.amount;
      }

      current.setUTCMonth(current.getUTCMonth() + 1);
    }
  });

  const db = await openEventDB();
  console.log("Loaded finances for version:");
  await db.put("view_state_cumulative_finances", result, replayVersionId);
}
