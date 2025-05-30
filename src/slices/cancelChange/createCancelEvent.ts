// src/slices/cancel/createCancelEvent.ts
import { createEvent } from "../shared/createEvent";
import type { Event as DomainEvent } from "../shared/genericTypes";

export function createCancelEvent(changeId: string): DomainEvent {
  return createEvent({ type: "ChangeCancelled", changeId });
}
