// src/slices/cancel/cancelChangeCommand.ts
import { DBEvents } from "../shared/DBEVents";
import { createCancelEvent } from "./createCancelEvent";

export function cancelChangeCommand(changeId: string) {
  const event = createCancelEvent(changeId);
  DBEvents.append(event);
}
