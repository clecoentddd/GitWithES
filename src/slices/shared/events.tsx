// events.ts
import { createEvent } from "././createEvent";
import { Event } from "./genericTypes";

export function createChangeEvent(): { event: Event, changeId: string } {
  const newId = `0x${(Math.random() * 10000).toFixed(0)}`;
  return {
    event: createEvent({ type: "ChangeCreated", changeId: newId }),
    changeId: newId
  };
}

export function createIncomeEvent(
  changeId: string,
  amount: number,
  description: string,
  startMonth: string,
  endMonth: string
): Event {
  return createEvent({
    type: "IncomeAdded",
    amount,
    description,
    belongsTo: changeId,
    period: {
      start: new Date(`${startMonth}-01`),
      end: new Date(`${endMonth}-01`),
    },
  });
}

export function createExpenseEvent(
  changeId: string,
  amount: number,
  description: string,
  startMonth: string,
  endMonth: string
): Event {
  return createEvent({
    type: "ExpenseAdded",
    amount,
    description,
    belongsTo: changeId,
    period: {
      start: new Date(`${startMonth}-01`),
      end: new Date(`${endMonth}-01`),
    },
  });
}

export function createPublishEvent(changeId: string): Event {
  return createEvent({ type: "ChangePublished", changeId });
}

export function createCancelEvent(changeId: string): Event {
  return createEvent({ type: "ChangeCancelled", changeId });
}