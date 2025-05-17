// commands.tsx
import { Event } from "../types/types";
import {
  createChangeEvent,
  createIncomeEvent,
  createExpenseEvent,
  createPublishEvent,
  createCancelEvent,
} from "./events";

export function createChangeCommand(
  setEvents: React.Dispatch<React.SetStateAction<Event[]>>,
  setChangeId: React.Dispatch<React.SetStateAction<string | null>>
) {
  const { event, changeId } = createChangeEvent();
  setEvents((evts) => [...evts, event]);
  setChangeId(changeId);
}

/**
 * Instead of adding event directly, return the staged event for caller to add to pendingEvents.
 */
export function addIncomeCommand(changeId: string): Event | null {
  if (!changeId) return null;

  const amount = Number(prompt("Amount:"));
  if (isNaN(amount)) {
    alert("Invalid amount");
    return null;
  }

  const description = prompt("Description:") || "";
  const startMonth = prompt("Start month (YYYY-MM):", "2025-01") || "2025-01";
  const endMonth = prompt("End month (YYYY-MM):", "2025-03") || "2025-03";

  return createIncomeEvent(changeId, amount, description, startMonth, endMonth);
}

/**
 * Similar change: return event instead of pushing directly.
 */
export function addExpenseCommand(changeId: string): Event | null {
  if (!changeId) return null;

  const amount = Number(prompt("Amount:"));
  if (isNaN(amount)) {
    alert("Invalid amount");
    return null;
  }

  const description = prompt("Description:") || "";
  const startMonth = prompt("Start month (YYYY-MM):", "2025-03") || "2025-03";
  const endMonth = prompt("End month (YYYY-MM):", "2025-04") || "2025-04";

  return createExpenseEvent(changeId, amount, description, startMonth, endMonth);
}

/**
 * Publish and cancel still add events directly.
 */
export function publishChangeCommand(
  changeId: string,
  setEvents: React.Dispatch<React.SetStateAction<Event[]>>,
  setChangeId: React.Dispatch<React.SetStateAction<string | null>>
) {
  if (!changeId) return;

  const event = createPublishEvent(changeId);
  setEvents((evts) => [...evts, event]);
  setChangeId(null);
}

export function cancelChangeCommand(
  changeId: string,
  setEvents: React.Dispatch<React.SetStateAction<Event[]>>,
  setChangeId: React.Dispatch<React.SetStateAction<string | null>>
) {
  if (!changeId) return;

  const event = createCancelEvent(changeId);
  setEvents((evts) => [...evts, event]);
  setChangeId(null);
}
